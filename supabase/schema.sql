create extension if not exists "uuid-ossp";

create table if not exists public.sources (
  id uuid primary key default uuid_generate_v4(),
  organization text not null,
  document_title text not null,
  document_type text,
  url text,
  publication_year int,
  date_accessed date,
  last_checked_at date,
  effective_date date,
  authority_level int not null default 4,
  exam_level text,
  specialization text,
  notes text,
  is_active boolean not null default true,
  status text not null default 'active'
);

create table if not exists public.competencies (
  id uuid primary key default uuid_generate_v4(),
  code text,
  title text not null,
  description text,
  exam_level text not null,
  exam_area text not null,
  specialization text,
  tos_weight numeric,
  official_source_id uuid references public.sources(id),
  status text not null default 'draft'
);

create table if not exists public.modules (
  id uuid primary key default uuid_generate_v4(),
  exam_level text not null,
  exam_area text not null,
  specialization text,
  title text not null,
  description text,
  sequence int not null default 0,
  estimated_minutes int,
  tos_weight numeric,
  status text not null default 'draft',
  published boolean not null default false
);

create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  sequence int not null default 0,
  learning_objectives jsonb not null default '[]',
  content jsonb not null default '{}',
  key_takeaways jsonb not null default '[]',
  estimated_minutes int,
  status text not null default 'draft',
  published boolean not null default false
);

create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_answer char(1) not null check (correct_answer in ('A','B','C','D')),
  rationale text not null,
  rationale_a text,
  rationale_b text,
  rationale_c text,
  rationale_d text,
  exam_level text not null,
  exam_area text not null,
  specialization text,
  module_id uuid references public.modules(id),
  lesson_id uuid references public.lessons(id),
  competency_id uuid references public.competencies(id),
  tos_reference text,
  bloom_level text,
  difficulty text,
  question_type text,
  source_id uuid references public.sources(id),
  verified boolean not null default false,
  review_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  exam_level text,
  program text,
  specialization text,
  target_exam_date date,
  daily_study_minutes int,
  role text not null default 'learner',
  created_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_answer char(1),
  is_correct boolean not null,
  attempted_at timestamptz not null default now(),
  duration_seconds int,
  last_seen_at timestamptz,
  times_seen int not null default 1,
  times_correct int not null default 0,
  times_wrong int not null default 0
);

create table if not exists public.competency_mastery (
  user_id uuid references auth.users(id) on delete cascade,
  competency_id uuid references public.competencies(id) on delete cascade,
  mastery_score numeric not null default 0,
  last_reviewed timestamptz,
  primary key(user_id, competency_id)
);

alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.competency_mastery enable row level security;

create policy "profiles self access" on public.profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attempts self access" on public.question_attempts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mastery self access" on public.competency_mastery
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
