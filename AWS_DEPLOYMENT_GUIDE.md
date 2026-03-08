# SupplySync - AWS Deployment Guide

## Architecture Overview

**Your Application:**
- **Backend:** FastAPI (Python) - Port 8001
- **Frontend:** React - Port 3000  
- **Database:** PostgreSQL (AWS RDS)

---

## AWS Services You'll Need

### 1. **AWS RDS (PostgreSQL)**
- Database: PostgreSQL 15
- Instance: db.t3.micro (for testing) or db.t3.small (production)
- Storage: 20GB minimum
- Public access: Yes (or use VPC properly)
- Security group: Allow port 5432 from your EC2 instances

### 2. **AWS EC2 (Application Server)**
- Instance: t3.small or t3.medium
- OS: Ubuntu 22.04 LTS
- Security Groups:
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  - Port 22 (SSH)
  - Port 8001 (Backend - internal only)
  - Port 3000 (Frontend - internal only)

### 3. **Optional but Recommended**
- **AWS ALB (Application Load Balancer):** Route traffic to frontend/backend
- **AWS Route53:** DNS management
- **AWS Certificate Manager:** Free SSL certificates
- **AWS S3:** Static file hosting (for React build)

---

## Step-by-Step Deployment Process

### **Phase 1: Set Up AWS RDS PostgreSQL**

1. **Create RDS Instance:**
   - Go to AWS RDS Console
   - Create Database → PostgreSQL
   - Choose version 15
   - Set master username: `postgres`
   - Set master password: (save this securely)
   - Enable public access (or configure VPC)
   - Note the endpoint: `your-db.xxxxx.us-east-1.rds.amazonaws.com`

2. **Configure Security Group:**
   - Allow inbound on port 5432
   - From your EC2 security group (or your IP for testing)

3. **Create Database:**
   ```bash
   psql -h your-db.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d postgres
   CREATE DATABASE supplysync;
   \q
   ```

---

### **Phase 2: Set Up EC2 Instance**

1. **Launch EC2 Instance:**
   - Ubuntu 22.04 LTS
   - t3.small (2 vCPU, 2GB RAM minimum)
   - 20GB storage
   - Create new key pair (save .pem file)

2. **SSH into Instance:**
   ```bash
   chmod 400 your-key.pem
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Python 3.11
   sudo apt install -y python3.11 python3.11-venv python3-pip
   
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install Yarn
   npm install -g yarn
   
   # Install PostgreSQL client
   sudo apt install -y postgresql-client
   
   # Install Nginx (reverse proxy)
   sudo apt install -y nginx
   
   # Install Supervisor (process manager)
   sudo apt install -y supervisor
   ```

---

### **Phase 3: Deploy Application**

1. **Clone Your Repository:**
   ```bash
   cd /home/ubuntu
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

2. **Set Up Backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure Backend Environment:**
   Create `/home/ubuntu/your-repo/backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-rds-endpoint.rds.amazonaws.com:5432/supplysync
   
   SECRET_KEY=your-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   
   CORS_ORIGINS=http://your-ec2-ip,https://your-domain.com
   
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Initialize Database:**
   ```bash
   cd /home/ubuntu/your-repo/backend
   source venv/bin/activate
   python3 -c "
   from database import engine
   from models import Base
   Base.metadata.create_all(bind=engine)
   print('Database tables created')
   "
   
   # Create admin user
   python3 -c "
   from database import SessionLocal
   from models import User
   from auth import get_password_hash
   
   db = SessionLocal()
   admin = User(
       username='admin',
       email='admin@supplysync.com',
       phone='0000000000',
       password_hash=get_password_hash('password'),
       user_type='admin',
       role='super_admin',
       is_active=True,
       is_verified=True
   )
   db.add(admin)
   db.commit()
   print('Admin user created')
   "
   ```

5. **Set Up Frontend:**
   ```bash
   cd /home/ubuntu/your-repo/frontend
   yarn install
   
   # Create production .env
   echo "REACT_APP_BACKEND_URL=http://your-ec2-ip/api" > .env
   
   # Build for production
   yarn build
   ```

---

### **Phase 4: Configure Nginx (Reverse Proxy)**

Create `/etc/nginx/sites-available/supplysync`:

```nginx
server {
    listen 80;
    server_name your-ec2-ip-or-domain;

    # Frontend (React build)
    location / {
        root /home/ubuntu/your-repo/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/supplysync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### **Phase 5: Configure Supervisor (Keep Backend Running)**

Create `/etc/supervisor/conf.d/supplysync-backend.conf`:

```ini
[program:supplysync-backend]
command=/home/ubuntu/your-repo/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
directory=/home/ubuntu/your-repo/backend
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/supplysync-backend.err.log
stdout_logfile=/var/log/supplysync-backend.out.log
environment=PATH="/home/ubuntu/your-repo/backend/venv/bin"
```

Start backend:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start supplysync-backend
sudo supervisorctl status
```

---

## **Phase 6: Verify Deployment**

1. **Check Backend:**
   ```bash
   curl http://localhost:8001/health
   ```

2. **Check Frontend:**
   ```bash
   curl http://your-ec2-ip
   ```

3. **Test Login:**
   - Open browser: `http://your-ec2-ip`
   - Login with: `dealer@supplysync.com` / `password123`

---

## **Phase 7: Domain & SSL (Optional but Recommended)**

1. **Point Domain to EC2:**
   - Go to Route53 (or your DNS provider)
   - Create A record: `supplysync.com` → Your EC2 IP

2. **Get Free SSL:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d supplysync.com
   ```

3. **Auto-renewal:**
   ```bash
   sudo certbot renew --dry-run
   ```

---

## Estimated AWS Costs

**Monthly Costs (US East 1):**
- RDS db.t3.micro: ~$15/month
- EC2 t3.small: ~$15/month
- Data transfer: ~$5-10/month
- **Total: ~$35-40/month**

(Much cheaper than paying credits for unstable dev environment!)

---

## Maintenance Commands

**View Backend Logs:**
```bash
sudo tail -f /var/log/supplysync-backend.out.log
```

**Restart Backend:**
```bash
sudo supervisorctl restart supplysync-backend
```

**Update Code:**
```bash
cd /home/ubuntu/your-repo
git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && yarn install && yarn build
sudo supervisorctl restart supplysync-backend
sudo systemctl restart nginx
```

---

## Backup Strategy

**Database Backups:**
- AWS RDS automated backups (enabled by default)
- Retention: 7 days
- Manual snapshot before major updates

**Application Backups:**
- Code: GitHub (already backed up)
- Environment files: Store in AWS Secrets Manager

---

## Need Help?

- AWS Documentation: https://docs.aws.amazon.com
- Your repo is ready for AWS deployment
- All code is PostgreSQL-compatible
- No changes needed to application code

**Ready to deploy!** 🚀
