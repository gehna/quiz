# 🚀 Деплой Quiz приложения на VPS с Node.js

## 📋 Требования к серверу

- **ОС:** Ubuntu 20.04+ или Debian 10+
- **RAM:** минимум 1GB (рекомендуется 2GB+)
- **CPU:** 1 ядро (рекомендуется 2+)
- **Диск:** минимум 10GB свободного места
- **Сеть:** статический IP адрес

## 🔧 Подготовка сервера

### 1. Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Установка Node.js 18+
```bash
# Установка Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version  # должно быть v18+
npm --version
```

### 3. Установка PM2 для управления процессами
```bash
sudo npm install -g pm2
```

### 4. Установка Nginx (опционально, для проксирования)
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 5. Настройка файрвола
```bash
# Разрешить SSH, HTTP и HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 4000  # порт приложения
sudo ufw --force enable
```

## 📦 Деплой приложения

### 1. Создание пользователя для приложения
```bash
# Создать пользователя quizapp
sudo adduser quizapp
sudo usermod -aG sudo quizapp

# Переключиться на пользователя quizapp
sudo su - quizapp
```

### 2. Клонирование репозитория
```bash
# Перейти в домашнюю директорию
cd ~

# Клонировать репозиторий (замените на ваш URL)
git clone https://github.com/yourusername/quiz-app.git
cd quiz-app

# Установить зависимости
npm install
```

### 3. Сборка приложения
```bash
# Собрать production версию
npm run build

# Проверить, что папка dist создалась
ls -la dist/
```

### 4. Настройка переменных окружения
```bash
# Создать .env файл
cp env.example .env

# Отредактировать .env (опционально)
nano .env
```

Содержимое `.env`:
```env
PORT=4000
NODE_ENV=production
```

### 5. Создание директории для данных
```bash
# Создать папку для данных
mkdir -p server/data

# Установить права доступа
chmod 755 server/data
```

## 🚀 Запуск приложения

### 1. Запуск с PM2
```bash
# Запустить приложение
pm2 start server/index.cjs --name "quiz-app"

# Проверить статус
pm2 status

# Посмотреть логи
pm2 logs quiz-app
```

### 2. Настройка автозапуска
```bash
# Сохранить текущую конфигурацию PM2
pm2 save

# Настроить автозапуск при перезагрузке сервера
pm2 startup

# Выполнить команду, которую покажет PM2 (обычно что-то вроде):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u quizapp --hp /home/quizapp
```

### 3. Проверка работы
```bash
# Проверить, что приложение слушает порт 4000
netstat -tlnp | grep :4000

# Проверить API
curl http://localhost:4000/api/judges?user=test
```

## 🌐 Настройка Nginx (рекомендуется)

### 1. Создание конфигурации Nginx
```bash
sudo nano /etc/nginx/sites-available/quiz-app
```

Содержимое файла (HTTPS с редиректом с HTTP):
```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;  # замените на ваш домен или IP

    # Если используете certbot впервые, можно временно оставить этот сервер для валидации
    # location /.well-known/acme-challenge/ {
    #     root /var/www/certbot;
    # }

    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;  # замените на ваш домен

    # SSL (пути создаст certbot)
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Логи
    access_log /var/log/nginx/quiz-app.access.log;
    error_log  /var/log/nginx/quiz-app.error.log;

    # Проксирование к Node.js приложению (порт 4000)
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # (Опционально) раздача статики из dist
    # location /static/ {
    #     alias /home/quizapp/quiz-app/dist/;
    #     expires 1y;
    #     add_header Cache-Control "public, immutable";
    # }
}
```

### 2. Активация конфигурации
```bash
# Создать символическую ссылку
sudo ln -s /etc/nginx/sites-available/quiz-app /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию
sudo nginx -t

# Перезапустить Nginx
sudo systemctl restart nginx
```

## 🔒 Настройка SSL (рекомендуется)

### 1. Установка Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Получение SSL сертификата
```bash
# Замените your-domain.com на ваш домен
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавить строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Мониторинг и управление

### PM2 команды
```bash
# Статус всех процессов
pm2 status

# Логи приложения
pm2 logs quiz-app

# Логи в реальном времени
pm2 logs quiz-app --lines 50

# Перезапуск приложения
pm2 restart quiz-app

# Остановка приложения
pm2 stop quiz-app

# Удаление из PM2
pm2 delete quiz-app

# Мониторинг ресурсов
pm2 monit
```

### Системные команды
```bash
# Проверка использования портов
sudo netstat -tlnp | grep :4000

# Проверка процессов Node.js
ps aux | grep node

# Проверка логов Nginx
sudo tail -f /var/log/nginx/quiz-app.access.log
sudo tail -f /var/log/nginx/quiz-app.error.log
```

## 🔄 Обновление приложения

### 1. Остановка приложения
```bash
pm2 stop quiz-app
```

### 2. Обновление кода
```bash
# Перейти в директорию приложения
cd ~/quiz-app

# Получить последние изменения
git pull origin main

# Установить новые зависимости (если есть)
npm install

# Пересобрать приложение
npm run build
```

### 3. Запуск обновленного приложения
```bash
pm2 restart quiz-app
```

## 💾 Резервное копирование

### 1. Создание бэкапа данных
```bash
# Создать скрипт для бэкапа
nano ~/backup.sh
```

Содержимое `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/quizapp/backups"
APP_DIR="/home/quizapp/quiz-app"

# Создать директорию для бэкапов
mkdir -p $BACKUP_DIR

# Создать архив с данными
tar -czf $BACKUP_DIR/quiz-data-$DATE.tar.gz -C $APP_DIR server/data

# Удалить старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "quiz-data-*.tar.gz" -mtime +7 -delete

echo "Backup created: quiz-data-$DATE.tar.gz"
```

### 2. Настройка автоматического бэкапа
```bash
# Сделать скрипт исполняемым
chmod +x ~/backup.sh

# Добавить в crontab (ежедневно в 2:00)
crontab -e
# Добавить строку:
# 0 2 * * * /home/quizapp/backup.sh
```

## 🚨 Устранение неполадок

### 1. Приложение не запускается
```bash
# Проверить логи
pm2 logs quiz-app

# Проверить порт
sudo netstat -tlnp | grep :4000

# Проверить права доступа
ls -la server/data/
```

### 2. Nginx не работает
```bash
# Проверить конфигурацию
sudo nginx -t

# Проверить статус
sudo systemctl status nginx

# Перезапустить
sudo systemctl restart nginx
```

### 3. Проблемы с правами доступа
```bash
# Установить правильные права
sudo chown -R quizapp:quizapp /home/quizapp/quiz-app
chmod -R 755 /home/quizapp/quiz-app/server/data
```

## ✅ Проверка деплоя

После завершения деплоя проверьте:

1. **Откройте приложение в браузере:**
   - `http://your-server-ip` (если используете Nginx)
   - `http://your-server-ip:4000` (прямое подключение)

2. **Проверьте функциональность:**
   - Регистрация/вход
   - Создание судей, этапов, команд
   - Распределение судей по этапам
   - Ввод оценок судьями
   - Генерация PDF отчета
   - Ручной ввод мест

3. **Проверьте API:**
   ```bash
   curl http://your-server-ip/api/judges?user=test
   ```

## 🎉 Готово!

Ваше приложение Quiz успешно развернуто на VPS! 

**Полезные ссылки:**
- PM2 документация: https://pm2.keymetrics.io/
- Nginx документация: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/

**Для поддержки:**
- Логи приложения: `pm2 logs quiz-app`
- Логи Nginx: `sudo tail -f /var/log/nginx/quiz-app.error.log`
- Статус системы: `pm2 monit`
