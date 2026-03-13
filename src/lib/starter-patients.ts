import type { Database } from "@/src/types/database";

type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
type StarterPatientDefinition = Omit<
  PatientInsert,
  "id" | "created_at" | "org_id" | "created_by" | "is_archived" | "archived_at" | "archived_by"
>;

const NAME_POOL: Array<{ firstName: string; gender: StarterPatientDefinition["gender"] }> = [
  { firstName: "Emma", gender: "Female" },
  { firstName: "Olivia", gender: "Female" },
  { firstName: "Sophia", gender: "Female" },
  { firstName: "Ava", gender: "Female" },
  { firstName: "Isabella", gender: "Female" },
  { firstName: "Mia", gender: "Female" },
  { firstName: "Charlotte", gender: "Female" },
  { firstName: "Amelia", gender: "Female" },
  { firstName: "Harper", gender: "Female" },
  { firstName: "Evelyn", gender: "Female" },
  { firstName: "Abigail", gender: "Female" },
  { firstName: "Ella", gender: "Female" },
  { firstName: "Grace", gender: "Female" },
  { firstName: "Chloe", gender: "Female" },
  { firstName: "Lily", gender: "Female" },
  { firstName: "Hannah", gender: "Female" },
  { firstName: "Zoe", gender: "Female" },
  { firstName: "Natalie", gender: "Female" },
  { firstName: "Lucy", gender: "Female" },
  { firstName: "Claire", gender: "Female" },
  { firstName: "James", gender: "Male" },
  { firstName: "William", gender: "Male" },
  { firstName: "Benjamin", gender: "Male" },
  { firstName: "Lucas", gender: "Male" },
  { firstName: "Henry", gender: "Male" },
  { firstName: "Alexander", gender: "Male" },
  { firstName: "Daniel", gender: "Male" },
  { firstName: "Michael", gender: "Male" },
  { firstName: "Ethan", gender: "Male" },
  { firstName: "Matthew", gender: "Male" },
  { firstName: "Jacob", gender: "Male" },
  { firstName: "Samuel", gender: "Male" },
  { firstName: "Nathan", gender: "Male" },
  { firstName: "Joseph", gender: "Male" },
  { firstName: "Andrew", gender: "Male" },
  { firstName: "David", gender: "Male" },
  { firstName: "Christopher", gender: "Male" },
  { firstName: "Ryan", gender: "Male" },
  { firstName: "Jonathan", gender: "Male" },
  { firstName: "Thomas", gender: "Male" },
  { firstName: "Taylor", gender: "Other" },
  { firstName: "Jordan", gender: "Other" },
  { firstName: "Casey", gender: "Other" },
  { firstName: "Morgan", gender: "Other" },
  { firstName: "Skyler", gender: "Other" },
  { firstName: "Avery", gender: "Other" },
  { firstName: "Cameron", gender: "Other" },
  { firstName: "Riley", gender: "Other" },
  { firstName: "Parker", gender: "Other" },
  { firstName: "Quinn", gender: "Other" },
];

const LAST_NAMES = [
  "Carter",
  "Bennett",
  "Brooks",
  "Turner",
  "Hughes",
  "Foster",
  "Reed",
  "Parker",
  "Watson",
  "Hayes",
];

export const STARTER_PATIENT_REGISTRY: StarterPatientDefinition[] = Array.from({ length: 100 }, (_, index) => {
  const person = NAME_POOL[index % NAME_POOL.length];
  const lastName = LAST_NAMES[Math.floor(index / NAME_POOL.length)] ?? LAST_NAMES[index % LAST_NAMES.length];
  const age = 19 + ((index * 7) % 62);
  const phoneSuffix = String(index).padStart(2, "0");

  return {
    name: `${person.firstName} ${lastName}`,
    age,
    gender: person.gender,
    phone: `+1 202 555 01${phoneSuffix}`,
  };
});
