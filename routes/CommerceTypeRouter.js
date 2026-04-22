import express from 'express';
import 
{ 
    getCommerceType, 
    getCommerceTypeSave, 
    postCommerceTypeSave, 
    getCommerceTypeEdit, 
    getCommerceTypeDelete,
    postCommerceTypeEdit,
    postCommerceTypeDelete 

} from '../controllers/CommerceTypeController.js';
import { uploadCommerceTypeIcon } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get('/', getCommerceType);

router.get('/save', getCommerceTypeSave);
router.post('/save', uploadCommerceTypeIcon, postCommerceTypeSave);

router.get('/edit/:id', getCommerceTypeEdit);
router.post('/edit', uploadCommerceTypeIcon, postCommerceTypeEdit);

router.get('/delete/:id', getCommerceTypeDelete);
router.post('/delete/:id', postCommerceTypeDelete);

export default router;
