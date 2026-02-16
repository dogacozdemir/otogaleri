-- Add Eksper and Grade to vehicle document types
USE otogaleri;

ALTER TABLE vehicle_documents
  MODIFY COLUMN document_type ENUM(
    'contract', 'registration', 'insurance', 'inspection',
    'customs', 'invoice', 'eksper', 'grade', 'other'
  ) NOT NULL;
