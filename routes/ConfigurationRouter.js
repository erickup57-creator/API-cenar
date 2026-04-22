import express from 'express';
import 
{ 
    getConfigurations, 
    getConfigurationSave, 
    postConfigurationSave, 
    getConfigurationEdit, 
    postConfigurationEdit
    
} from '../controllers/ConfigurationController.js';

const router = express.Router();

router.get('/', getConfigurations);

router.get('/save', getConfigurationSave);
router.post('/save', postConfigurationSave);

router.get('/edit/:id', getConfigurationEdit);
router.post('/edit', postConfigurationEdit);

export default router;