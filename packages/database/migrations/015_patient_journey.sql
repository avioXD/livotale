-- 015: Patient journey status tracking and onboarding questionnaire seeds.

BEGIN;

ALTER TABLE clinical.patients
  ADD COLUMN IF NOT EXISTS journey_status varchar(40) NOT NULL DEFAULT 'registered',
  ADD COLUMN IF NOT EXISTS journey_timestamps jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

UPDATE clinical.patients
SET registered_at = created_at
WHERE registered_at IS NULL;

-- Liver symptoms questionnaire
INSERT INTO clinical.questionnaires (code, title, version, status)
VALUES ('LIVER_SYMPTOMS', 'Liver Symptoms Questionnaire', '1.0', 'active')
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, version = EXCLUDED.version, status = 'active';

INSERT INTO clinical.questionnaire_questions (questionnaire_id, question_text, question_type, options, risk_weight, sort_order, is_required)
SELECT q.id, v.question_text, v.question_type::clinical.question_type_enum, v.options::jsonb, v.risk_weight, v.sort_order, v.is_required
FROM clinical.questionnaires q
CROSS JOIN (VALUES
  ('Do you experience fatigue or low energy?', 'boolean', '[]', 2, 1, true),
  ('Do you have pain or discomfort in the upper right abdomen?', 'boolean', '[]', 3, 2, true),
  ('Have you noticed yellowing of eyes or skin (jaundice)?', 'boolean', '[]', 5, 3, true),
  ('Do you experience nausea or loss of appetite?', 'boolean', '[]', 2, 4, true),
  ('Have you had unexplained weight loss in the last 3 months?', 'boolean', '[]', 3, 5, true),
  ('Do you experience swelling in legs or abdomen?', 'boolean', '[]', 4, 6, true)
) AS v(question_text, question_type, options, risk_weight, sort_order, is_required)
WHERE q.code = 'LIVER_SYMPTOMS'
  AND NOT EXISTS (
    SELECT 1 FROM clinical.questionnaire_questions qq WHERE qq.questionnaire_id = q.id
  );

-- Risk assessment questionnaire
INSERT INTO clinical.questionnaires (code, title, version, status)
VALUES ('LIVER_RISK', 'Liver Risk Assessment', '1.0', 'active')
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, version = EXCLUDED.version, status = 'active';

INSERT INTO clinical.questionnaire_questions (questionnaire_id, question_text, question_type, options, risk_weight, sort_order, is_required)
SELECT q.id, v.question_text, v.question_type::clinical.question_type_enum, v.options::jsonb, v.risk_weight, v.sort_order, v.is_required
FROM clinical.questionnaires q
CROSS JOIN (VALUES
  ('Do you have NAFLD or fatty liver diagnosis?', 'boolean', '[]', 4, 1, true),
  ('What is your alcohol consumption?', 'single_choice', '[{"value":"never","label":"Never"},{"value":"occasional","label":"Occasional"},{"value":"regular","label":"Regular"},{"value":"stopped","label":"Stopped"}]', 5, 2, true),
  ('History of viral hepatitis (B or C)?', 'boolean', '[]', 6, 3, true),
  ('Do you have Type 2 diabetes?', 'boolean', '[]', 4, 4, true),
  ('Do you have high cholesterol or dyslipidemia?', 'boolean', '[]', 3, 5, true),
  ('Do you have hypertension?', 'boolean', '[]', 2, 6, true),
  ('Family history of liver disease?', 'boolean', '[]', 3, 7, true)
) AS v(question_text, question_type, options, risk_weight, sort_order, is_required)
WHERE q.code = 'LIVER_RISK'
  AND NOT EXISTS (
    SELECT 1 FROM clinical.questionnaire_questions qq WHERE qq.questionnaire_id = q.id
  );

COMMIT;
