export {
  getMarksStudentsBySubject,
  submitMarks,
  updateMarksRecord,
  deleteMarksRecord,
  getMarksRecordsBySubject,
  getMyMarksRecords,
} from './marksApi';

export type {
  MarksStudent,
  MarksMode,
  MarksRecord,
  SubmitMarksRecord,
  SubmitMarksRequest,
  UpdateMarksRequest,
} from './types';
