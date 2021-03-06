import { Router } from 'express';
import multer from 'multer';
import multerConfig from './config/multer';
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import MeetupController from './app/controllers/MeetupController';
import OrganizingController from './app/controllers/OrganizingController';
import SubscriptionController from './app/controllers/SubscriptionController';
import authMiddleware from './app/middlewares/auth';

const routes = new Router();
const upload = multer(multerConfig);

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.get('/users', UserController.index);
routes.get('/meetups', MeetupController.index);
routes.get('/organizing', OrganizingController.index);
routes.get('/subscriptions', SubscriptionController.index);

routes.post('/files', upload.single('file'), FileController.store);
routes.post('/meetups', MeetupController.store);
routes.post('/subscriptions', SubscriptionController.store);

routes.put('/users', UserController.update);
routes.put('/meetups/:id', MeetupController.update);

routes.delete('/meetups/:id', MeetupController.delete);

export default routes;
