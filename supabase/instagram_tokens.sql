-- Tabela de tokens do Instagram por usuário
create table if not exists instagram_tokens (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  access_token       text not null,
  instagram_user_id  text not null,
  username           text,
  expires_at         timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table instagram_tokens enable row level security;

create policy "Users can manage their own instagram tokens"
  on instagram_tokens for all
  using (auth.uid() = user_id);
