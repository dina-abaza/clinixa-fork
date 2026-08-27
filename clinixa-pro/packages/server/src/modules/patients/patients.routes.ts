import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/permission.middleware';
import {
  listPatients,
  getPatient,
  createNewPatient,
  updatePatientInfo,
  toggleActive,
  getDue,
  getMedicalRecordInfo,
  addMedicalAlertInfo,
  addHistory,
  addDiagnosisInfo,
  addMedicationInfo,
  stopMedicationInfo,
  refillMedicationInfo,
  addPrescriptionInfo,
  addLabInfo,
  addRadiologyInfo,
} from './patients.controller';

const router = Router();

// تطبيق ميدلوير المصادقة على جميع مسارات المرضى
router.use(authMiddleware);

// مسارات إدارة المرضى الأساسية
router.get('/', requirePermission('pat.view'), listPatients);
router.post('/', requirePermission('pat.add'), createNewPatient);
router.get('/:id', requirePermission('pat.view'), getPatient);
router.put('/:id', requirePermission('pat.edit'), updatePatientInfo);
router.patch('/:id/toggle-active', requirePermission('pat.off'), toggleActive);
router.get('/:id/due', requirePermission('pat.view'), getDue);

// مسارات السجل الطبي
router.get('/:id/medical-record', requirePermission('pat.view'), getMedicalRecordInfo);
router.post('/:id/medical-alerts', requirePermission('pat.edit'), addMedicalAlertInfo);
router.post('/:id/medical-history', requirePermission('pat.edit'), addHistory);
router.post('/:id/diagnoses', requirePermission('pat.edit'), addDiagnosisInfo);
router.post('/:id/medications', requirePermission('pat.edit'), addMedicationInfo);
router.post('/:id/prescriptions', requirePermission('pat.edit'), addPrescriptionInfo);
router.post('/:id/labs', requirePermission('pat.edit'), addLabInfo);
router.post('/:id/radiology', requirePermission('pat.edit'), addRadiologyInfo);

export default router;
