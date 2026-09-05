# Настройка полностью через браузер

Терминал не нужен: используются GitHub Web Editor, Supabase Dashboard и Cloudflare Dashboard.

## 1. Supabase Storage

1. Зарегистрируйтесь на [Supabase](https://supabase.com/) и создайте проект на тарифе Free.
2. Откройте **Storage → New bucket**.
3. Назовите bucket `hse-study-planner-files` и оставьте его приватным.
4. Откройте **Connect** и скопируйте Project URL.
5. Откройте **Settings → API Keys**, создайте или скопируйте серверный Secret key вида `sb_secret_...`.

Secret key нельзя добавлять в GitHub, `.env.example`, клиентский код или переменную с префиксом `NEXT_PUBLIC_`.

## 2. Конфигурация GitHub

1. В репозитории нажмите клавишу `.` или откройте нужный файл кнопкой с карандашом.
2. Создайте в корне файл `wrangler.jsonc`, скопировав содержимое `wrangler.example.jsonc`.
3. Вставьте настоящий D1 Database ID вместо `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
4. Сохраните изменение кнопкой **Commit changes**.

Конфигурация больше не содержит R2 binding.

## 3. Переменные Cloudflare Worker

Откройте **Workers & Pages → hse-study-planner → Settings → Variables and Secrets** и добавьте:

| Тип | Имя | Значение |
|---|---|---|
| Text или Secret | `SUPABASE_URL` | Project URL из Supabase |
| Secret | `SUPABASE_SECRET_KEY` | ключ `sb_secret_...` |
| Text | `SUPABASE_STORAGE_BUCKET` | `hse-study-planner-files` |

Если у Worker осталась привязка `BUCKET` к R2, удалите её. Привязка D1 должна остаться с именем `DB`.

После сохранения переменных откройте **Deployments** и повторите последний деплой либо внесите новый commit в GitHub. При Git integration Cloudflare соберёт приложение автоматически.

## 4. Проверка

1. Откройте планер и загрузите небольшой PDF или изображение.
2. Перезагрузите страницу и откройте файл из карточки материала.
3. В Supabase откройте **Storage → hse-study-planner-files**: объект должен появиться внутри папки пользователя.
4. Удалите материал в планере и убедитесь, что объект исчез из bucket.

Метаданные и связи файла с предметами, темами и занятиями остаются в Cloudflare D1. Сам файл хранится в приватном Supabase bucket и выдаётся только через серверный маршрут `/api/files`.

## Старые файлы R2

Объекты, ранее загруженные в R2, автоматически в Supabase не переносятся. Их нужно скачать до отключения R2 и повторно загрузить в планер после переключения. Ссылочные материалы переносить не требуется.
