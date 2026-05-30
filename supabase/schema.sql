create extension if not exists pgcrypto;

create table if not exists companies (
  id text primary key,
  name text not null unique,
  website text,
  careers_url text,
  why_fit text,
  current_focus text,
  personalization_angle text,
  hiring_status text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists roles (
  id text primary key,
  company_name text not null,
  title text not null,
  location text,
  work_arrangement text,
  salary_min text,
  salary_max text,
  source text,
  job_url text unique,
  industry text,
  company_stage text,
  experience_required text,
  visa_sponsorship text,
  posted_date text,
  status text default 'To Apply',
  jd_text text,
  fit_score int,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id text primary key,
  company_name text not null,
  linked_role text,
  name text not null,
  title text,
  linkedin text,
  email text,
  status text default 'Researching',
  source text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists message_drafts (
  id text primary key,
  company_name text not null,
  contact_name text not null,
  contact_title text,
  linkedin text,
  email text,
  email_subject text,
  email_body text,
  linkedin_note text,
  personalization_line text,
  updated_at timestamptz default now()
);

create table if not exists outreach_logs (
  id text primary key,
  company_name text not null,
  linked_role text,
  contact_name text,
  date text,
  channel text,
  message_type text,
  status text,
  follow_up_at text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists watcher_runs (
  id text primary key,
  run_date text,
  status text,
  roles_found int default 0,
  qualified_roles int default 0,
  roles_added int default 0,
  public_contacts int default 0,
  query text,
  notes text,
  created_at timestamptz default now()
);
