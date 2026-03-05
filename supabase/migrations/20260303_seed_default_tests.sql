with seed(test_name, price, normal_range) as (
  values
    ('Complete Blood Count (CBC)', 25.00, 'WBC: 4,000-11,000/uL'),
    ('Blood Sugar (Fasting)', 12.00, '70-99 mg/dL'),
    ('HbA1c', 20.00, '4.0-5.6 %'),
    ('Lipid Profile', 35.00, 'Total Cholesterol < 200 mg/dL'),
    ('Liver Function Test (LFT)', 30.00, 'ALT: 7-56 U/L'),
    ('Kidney Function Test (KFT)', 28.00, 'Creatinine: 0.7-1.3 mg/dL'),
    ('Thyroid Profile (TSH)', 18.00, '0.4-4.0 mIU/L'),
    ('Urine Routine', 10.00, 'pH: 4.5-8.0')
)
update public.tests t
set
  price = s.price,
  normal_range = s.normal_range
from seed s
where t.test_name = s.test_name;

with seed(test_name, price, normal_range) as (
  values
    ('Complete Blood Count (CBC)', 25.00, 'WBC: 4,000-11,000/uL'),
    ('Blood Sugar (Fasting)', 12.00, '70-99 mg/dL'),
    ('HbA1c', 20.00, '4.0-5.6 %'),
    ('Lipid Profile', 35.00, 'Total Cholesterol < 200 mg/dL'),
    ('Liver Function Test (LFT)', 30.00, 'ALT: 7-56 U/L'),
    ('Kidney Function Test (KFT)', 28.00, 'Creatinine: 0.7-1.3 mg/dL'),
    ('Thyroid Profile (TSH)', 18.00, '0.4-4.0 mIU/L'),
    ('Urine Routine', 10.00, 'pH: 4.5-8.0')
)
insert into public.tests (test_name, price, normal_range)
select s.test_name, s.price, s.normal_range
from seed s
where not exists (
  select 1
  from public.tests t
  where t.test_name = s.test_name
);
