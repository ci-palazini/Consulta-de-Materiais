-- cm_attachments: stores file attachment metadata for CMs
create table public.cm_attachments (
  id           uuid primary key default gen_random_uuid(),
  cm_id        uuid not null references public.cms(id) on delete cascade,
  uploaded_by  uuid not null references public.profiles(id),
  file_name    text not null,
  file_size    bigint not null,
  mime_type    text not null,
  storage_path text not null,
  created_at   timestamptz default now()
);

alter table public.cm_attachments enable row level security;

create policy "Authenticated users can view attachments"
  on public.cm_attachments for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert attachments"
  on public.cm_attachments for insert
  with check (auth.uid() = uploaded_by);

create policy "Uploader can delete their attachments"
  on public.cm_attachments for delete
  using (auth.uid() = uploaded_by);

-- Storage bucket: cm-attachments (created via Supabase MCP)
-- insert into storage.buckets (id, name, public) values ('cm-attachments', 'cm-attachments', false);
