import Sequelize from 'sequelize';
import User from '../app/models/UserModel';
import File from '../app/models/FileModel';
import Meetup from '../app/models/MeetupModel';
import Subscription from '../app/models/SubscriptionModel';
import databaseConfig from '../config/database';

const models = [User, File, Meetup, Subscription];

class Database {
  constructor() {
    this.connection = new Sequelize(databaseConfig);
    this.init();
  }

  init() {
    models
      .map(model => model.init(this.connection))
      .map(model => model.associate && model.associate(this.connection.models));
  }
}

export default new Database();
