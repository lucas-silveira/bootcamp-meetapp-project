import * as Yup from 'yup';
import {
  isBefore,
  parseISO,
  subHours,
  startOfHour,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Op } from 'sequelize';
import User from '../models/UserModel';
import File from '../models/FileModel';
import Meetup from '../models/MeetupModel';
import Subscription from '../models/SubscriptionModel';

class MeetupController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const where = {};

    if (req.query.date) {
      const searchDate = parseISO(req.query.date);
      where.date = {
        [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
      };
    }

    const meetups = await Meetup.findAll({
      where,
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: Subscription,
          attributes: ['user_id'],
        },
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
    });

    if (!meetups) return res.status(400).json({ error: 'No matches found' });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      image: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation Fails' });

    const subDateOfMeetup = subHours(parseISO(req.body.date), 2);

    if (isBefore(subDateOfMeetup, new Date()))
      return res
        .status(401)
        .json({ error: 'You can only create a meetup on future dates' });

    const hourStart = startOfHour(parseISO(req.body.date));

    const checkAvailability = await Meetup.findOne({
      where: {
        user_id: req.userId,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res.status(400).json({ error: 'Meetup date is not available' });
    }

    const meetup = await Meetup.create({
      ...req.body,
      user_id: req.userId,
    });

    return res.json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      date: Yup.date().required(),
      image: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body)))
      return res.status(400).json({ error: 'Validation Fails' });

    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) return res.status(400).json({ error: 'Meetup dont exists' });

    if (meetup.user_id != req.userId)
      return res
        .status(401)
        .json({ error: 'You dont have permission for edit this meetup' });

    const subDateOfMeetup = subHours(parseISO(req.body.date), 2);

    if (isBefore(subDateOfMeetup, new Date()))
      return res
        .status(401)
        .json({ error: 'You can only update a meetup on future dates' });

    const hourStart = startOfHour(parseISO(req.body.date));

    const checkAvailability = await Meetup.findOne({
      where: {
        user_id: req.userId,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res.status(400).json({ error: 'Meetup date is not available' });
    }

    try {
      await meetup.update(req.body);

      return res.json(req.body);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) return res.status(400).json({ error: 'Meetup dont exists' });

    if (meetup.user_id != req.userId)
      return res
        .status(401)
        .json({ error: 'You dont have permission for delete this meetup' });

    try {
      await meetup.destroy();
      return res.status(200).json();
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default new MeetupController();
