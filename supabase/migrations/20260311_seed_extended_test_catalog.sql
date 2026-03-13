-- Seed 20 test definitions for QA/UAT.
-- Idempotent: re-running updates existing rows by test_name.

with target_org as (
  select id as org_id
  from public.organizations
  order by created_at asc
  limit 1
),
seed(test_name, category, price, units, reference_range, normal_range) as (
  values
    ('Complete Blood Count (CBC)', 'Hematology', 25.00, 'Panel', 'WBC: 4,000-11,000/uL', 'WBC: 4,000-11,000/uL'),
    ('ESR', 'Hematology', 10.00, 'mm/hr', '0-20 mm/hr', '0-20 mm/hr'),
    ('Hemoglobin (Hb)', 'Hematology', 8.00, 'g/dL', 'Male: 13.5-17.5, Female: 12.0-15.5', 'Male: 13.5-17.5, Female: 12.0-15.5'),
    ('Blood Sugar (Fasting)', 'Biochemistry', 12.00, 'mg/dL', '70-99 mg/dL', '70-99 mg/dL'),
    ('Blood Sugar (PP)', 'Biochemistry', 12.00, 'mg/dL', '<140 mg/dL', '<140 mg/dL'),
    ('HbA1c', 'Biochemistry', 20.00, '%', '4.0-5.6 %', '4.0-5.6 %'),
    ('Lipid Profile', 'Biochemistry', 35.00, 'Panel', 'Total Cholesterol < 200 mg/dL', 'Total Cholesterol < 200 mg/dL'),
    ('Liver Function Test (LFT)', 'Biochemistry', 30.00, 'Panel', 'ALT: 7-56 U/L', 'ALT: 7-56 U/L'),
    ('Kidney Function Test (KFT)', 'Biochemistry', 28.00, 'Panel', 'Creatinine: 0.7-1.3 mg/dL', 'Creatinine: 0.7-1.3 mg/dL'),
    ('Serum Creatinine', 'Biochemistry', 9.00, 'mg/dL', '0.7-1.3 mg/dL', '0.7-1.3 mg/dL'),
    ('Blood Urea', 'Biochemistry', 9.00, 'mg/dL', '15-40 mg/dL', '15-40 mg/dL'),
    ('Electrolytes (Na/K/Cl)', 'Biochemistry', 22.00, 'Panel', 'Na: 135-145, K: 3.5-5.0 mEq/L', 'Na: 135-145, K: 3.5-5.0 mEq/L'),
    ('Thyroid Profile (TSH)', 'Endocrinology', 18.00, 'mIU/L', '0.4-4.0 mIU/L', '0.4-4.0 mIU/L'),
    ('T3', 'Endocrinology', 15.00, 'ng/dL', '80-200 ng/dL', '80-200 ng/dL'),
    ('T4', 'Endocrinology', 15.00, 'ug/dL', '5.0-12.0 ug/dL', '5.0-12.0 ug/dL'),
    ('Vitamin D (25-OH)', 'Vitamins', 28.00, 'ng/mL', '30-100 ng/mL', '30-100 ng/mL'),
    ('Vitamin B12', 'Vitamins', 24.00, 'pg/mL', '200-900 pg/mL', '200-900 pg/mL'),
    ('CRP', 'Immunology', 14.00, 'mg/L', '<5 mg/L', '<5 mg/L'),
    ('D-Dimer', 'Coagulation', 32.00, 'ng/mL FEU', '<500 ng/mL FEU', '<500 ng/mL FEU'),
    ('Urine Routine', 'Clinical Pathology', 10.00, 'Panel', 'pH: 4.5-8.0', 'pH: 4.5-8.0')
)
insert into public.tests (org_id, test_name, category, price, units, reference_range, normal_range)
select o.org_id, s.test_name, s.category, s.price, s.units, s.reference_range, s.normal_range
from seed s
cross join target_org o
on conflict (test_name)
do update set
  category = excluded.category,
  price = excluded.price,
  units = excluded.units,
  reference_range = excluded.reference_range,
  normal_range = excluded.normal_range;
