do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.tests'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%test_name%'
  loop
    execute format('alter table public.tests drop constraint %I', c.conname);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tests_org_id_test_name_unique'
  ) then
    alter table public.tests
      add constraint tests_org_id_test_name_unique unique (org_id, test_name);
  end if;
end $$;

with seed(test_name, category, price, units, reference_range, normal_range) as (
  values
    ('Complete Blood Count (CBC)', 'Hematology', 25.00, 'Panel', 'WBC 4,000-11,000/uL; Platelets 150,000-450,000/uL', 'WBC 4,000-11,000/uL; Hb Adult M 13.5-17.5 g/dL, F 12.0-15.5 g/dL'),
    ('Erythrocyte Sedimentation Rate (ESR)', 'Hematology', 10.00, 'mm/hr', 'Adult male 0-15 mm/hr; adult female 0-20 mm/hr', '0-20 mm/hr'),
    ('Hemoglobin (Hb)', 'Hematology', 8.00, 'g/dL', 'Male 13.5-17.5 g/dL; Female 12.0-15.5 g/dL', 'Adult male 13.5-17.5 g/dL; adult female 12.0-15.5 g/dL'),
    ('Blood Sugar (Fasting)', 'Biochemistry', 12.00, 'mg/dL', 'Normal 70-99 mg/dL; impaired fasting 100-125 mg/dL', '70-99 mg/dL'),
    ('Blood Sugar (Postprandial)', 'Biochemistry', 12.00, 'mg/dL', 'Normal <140 mg/dL; impaired 140-199 mg/dL', '<140 mg/dL'),
    ('HbA1c', 'Biochemistry', 20.00, '%', 'Normal <5.7%; prediabetes 5.7-6.4%; diabetes >=6.5%', '4.0-5.6%'),
    ('Lipid Profile', 'Biochemistry', 35.00, 'Panel', 'LDL <100 mg/dL; HDL >40 mg/dL', 'Total cholesterol <200 mg/dL; Triglycerides <150 mg/dL'),
    ('Liver Function Test (LFT)', 'Biochemistry', 30.00, 'Panel', 'Bilirubin total 0.3-1.2 mg/dL', 'ALT 7-56 U/L; AST 10-40 U/L'),
    ('Kidney Function Test (KFT)', 'Biochemistry', 28.00, 'Panel', 'BUN 7-20 mg/dL', 'Creatinine 0.7-1.3 mg/dL; Urea 15-40 mg/dL'),
    ('Serum Creatinine', 'Biochemistry', 9.00, 'mg/dL', 'Adult 0.7-1.3 mg/dL', '0.7-1.3 mg/dL'),
    ('Blood Urea', 'Biochemistry', 9.00, 'mg/dL', 'Adult 15-40 mg/dL', '15-40 mg/dL'),
    ('Electrolytes (Na/K/Cl)', 'Biochemistry', 22.00, 'mEq/L', 'Sodium 135-145 mEq/L; Potassium 3.5-5.0 mEq/L', 'Na 135-145; K 3.5-5.0; Cl 98-106'),
    ('Thyroid Stimulating Hormone (TSH)', 'Endocrinology', 18.00, 'mIU/L', 'Adult 0.4-4.0 mIU/L', '0.4-4.0 mIU/L'),
    ('Triiodothyronine (T3)', 'Endocrinology', 15.00, 'ng/dL', 'Adult 80-200 ng/dL', '80-200 ng/dL'),
    ('Thyroxine (T4)', 'Endocrinology', 15.00, 'ug/dL', 'Adult 5.0-12.0 ug/dL', '5.0-12.0 ug/dL'),
    ('Vitamin D (25-OH)', 'Vitamins', 28.00, 'ng/mL', 'Deficient <20 ng/mL; insufficient 20-29 ng/mL', '30-100 ng/mL'),
    ('Vitamin B12', 'Vitamins', 24.00, 'pg/mL', 'Adult 200-900 pg/mL', '200-900 pg/mL'),
    ('C-Reactive Protein (CRP)', 'Immunology', 14.00, 'mg/L', 'Adult <5 mg/L', '<5 mg/L'),
    ('D-Dimer', 'Coagulation', 32.00, 'ng/mL FEU', 'Adult <500 ng/mL FEU', '<500 ng/mL FEU'),
    ('Urine Routine Examination', 'Clinical Pathology', 10.00, 'Panel', 'Specific gravity 1.005-1.030', 'pH 4.5-8.0; Protein negative; Glucose negative')
)
insert into public.tests (org_id, test_name, category, price, units, reference_range, normal_range)
select o.id, s.test_name, s.category, s.price, s.units, s.reference_range, s.normal_range
from public.organizations o
cross join seed s
on conflict (org_id, test_name)
do update set
  category = excluded.category,
  price = excluded.price,
  units = excluded.units,
  reference_range = excluded.reference_range,
  normal_range = excluded.normal_range;
