import { isBefore } from 'date-fns';
import { Op } from 'sequelize';
import User from '../models/UserModel';
import Meetup from '../models/MeetupModel';
import File from '../models/FileModel';
import Subscription from '../models/SubscriptionModel';
import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';

class SubscriptionController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      attributes: ['meetup_id'],
      include: [
        {
          model: Meetup,
          as: 'meetup',
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          attributes: ['title', 'description', 'location', 'date'],
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['name', 'email'],
              include: [
                {
                  model: File,
                  as: 'avatar',
                  attributes: ['path', 'url'],
                },
              ],
            },
          ],
        },
      ],
      order: [['meetup', 'date']],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.body.meetup_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!meetup) return res.status(400).json({ error: 'Meetup dont exists' });

    if (meetup.user_id === req.userId)
      return res
        .status(400)
        .json({ error: 'You dont can subscriber in your own meetups' });

    if (isBefore(meetup.date, new Date()))
      return res
        .status(401)
        .json({ error: 'You dont can subscriber in meetups past' });

    const subscriptionExist = await Subscription.findOne({
      where: {
        meetup_id: req.body.meetup_id,
        user_id: req.userId,
      },
    });

    if (subscriptionExist)
      return res.status(400).json({ error: 'You already subscribed' });

    const subscriberOnSameHour = await Subscription.findOne({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          as: 'meetup',
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (subscriberOnSameHour)
      return res
        .status(400)
        .json({ error: "Can't subscribe to two meetups at the same time" });

    await Subscription.create({
      meetup_id: req.body.meetup_id,
      user_id: req.userId,
    });

    await Queue.add(SubscriptionMail.key, { meetup, user });

    return res.json({
      meetup: req.body.meetup_id,
      date: meetup.date,
    });
  }
}

export default new SubscriptionController();
