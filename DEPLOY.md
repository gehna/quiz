# Инструкция по деплою Quiz приложения

## Варианты деплоя

### 1. Vercel (Рекомендуется)

#### Подготовка:
```bash
# 1. Соберите приложение
npm run build

# 2. Установите Vercel CLI
npm i -g vercel

# 3. Войдите в аккаунт Vercel
vercel login
```

#### Деплой:
```bash
# Деплой на Vercel
vercel

# Для production
vercel --prod
```

#### Настройка переменных окружения в Vercel:
1. Зайдите в панель Vercel
2. Выберите ваш проект
3. Settings → Environment Variables
4. Добавьте:
   - `PORT` = `4000`
   - `NODE_ENV` = `production`

### 2. Netlify

#### Подготовка:
```bash
# 1. Соберите приложение
npm run build

# 2. Установите Netlify CLI
npm i -g netlify-cli

# 3. Войдите в аккаунт Netlify
netlify login
```

#### Деплой:
```bash
# Создайте netlify.toml
cat > netlify.toml << EOF
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

# Деплой
netlify deploy --prod --dir=dist
```

### 3. VPS/Сервер с Node.js

#### Подготовка сервера:
```bash
# 1. Установите Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установите PM2 для управления процессами
sudo npm install -g pm2

# 3. Создайте пользователя для приложения
sudo adduser quizapp
sudo su - quizapp
```

#### Деплой:
```bash
# 1. Клонируйте репозиторий
git clone <your-repo-url>
cd quiz

# 2. Установите зависимости
npm install

# 3. Соберите приложение
npm run build

# 4. Создайте .env файл (опционально)
cp env.example .env
nano .env  # Настройте переменные при необходимости

# 5. Запустите с PM2
pm2 start server/index.cjs --name "quiz-app"

# 6. Настройте автозапуск
pm2 startup
pm2 save
```

#### Настройка Nginx (опционально):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Docker

#### Сборка и запуск:
```bash
# 1. Соберите образ
docker build -t quiz-app .

# 2. Запустите контейнер
docker run -d \
  --name quiz-app \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -v $(pwd)/data:/app/server/data \
  quiz-app

# 3. Или используйте docker-compose
cat > docker-compose.yml << EOF
version: '3.8'
services:
  quiz-app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
    volumes:
      - ./data:/app/server/data
    restart: unless-stopped
EOF

docker-compose up -d
```

## Проверка деплоя

После деплоя проверьте:
1. Откройте приложение в браузере
2. Зарегистрируйтесь/войдите
3. Создайте тестовые данные (судьи, этапы, команды)
4. Проверьте генерацию PDF отчета
5. Проверьте работу ручного ввода мест

## Мониторинг

### PM2 команды:
```bash
pm2 status          # Статус процессов
pm2 logs quiz-app   # Логи приложения
pm2 restart quiz-app # Перезапуск
pm2 stop quiz-app   # Остановка
```

### Docker команды:
```bash
docker ps                    # Список контейнеров
docker logs quiz-app         # Логи контейнера
docker restart quiz-app      # Перезапуск
docker stop quiz-app         # Остановка
```

## Резервное копирование

Данные хранятся в папке `server/data/`. Регулярно создавайте резервные копии:

```bash
# Создание бэкапа
tar -czf backup-$(date +%Y%m%d).tar.gz server/data/

# Восстановление
tar -xzf backup-20240101.tar.gz
```
