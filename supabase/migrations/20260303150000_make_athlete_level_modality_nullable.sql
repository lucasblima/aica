-- Allow athletes to be created without level/modality
-- Coach assigns these when prescribing workouts
ALTER TABLE athletes ALTER COLUMN level DROP NOT NULL;
ALTER TABLE athletes ALTER COLUMN modality DROP NOT NULL;
