# AWS Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] AWS Account access
- [ ] GitHub repository with latest code
- [ ] Cloudinary credentials
- [ ] Domain name (optional but recommended)

---

## 📋 Step-by-Step Deployment

### 1. AWS RDS Setup (15 minutes)
- [ ] Create PostgreSQL RDS instance
- [ ] Note endpoint: `___________________________.rds.amazonaws.com`
- [ ] Note password: `___________________________`
- [ ] Configure security group (port 5432)
- [ ] Test connection from local machine

### 2. AWS EC2 Setup (30 minutes)
- [ ] Launch EC2 instance (Ubuntu 22.04)
- [ ] Note public IP: `___________________________`
- [ ] Download .pem key file
- [ ] Configure security group (ports 80, 443, 22)
- [ ] SSH into instance
- [ ] Run `aws_setup.sh` to install dependencies
- [ ] Clone your GitHub repository

### 3. Backend Configuration (15 minutes)
- [ ] Create Python virtual environment
- [ ] Install requirements: `pip install -r requirements.txt`
- [ ] Create `.env` file with RDS connection string
- [ ] Run database initialization script
- [ ] Test backend: `curl http://localhost:8001/health`

### 4. Frontend Configuration (10 minutes)
- [ ] Install Node packages: `yarn install`
- [ ] Create `.env` with backend URL
- [ ] Build production: `yarn build`
- [ ] Verify build folder exists

### 5. Nginx Setup (10 minutes)
- [ ] Create Nginx config file
- [ ] Enable site
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx
- [ ] Test: `curl http://your-ec2-ip`

### 6. Supervisor Setup (5 minutes)
- [ ] Create supervisor config for backend
- [ ] Update supervisor
- [ ] Start backend service
- [ ] Check status: `sudo supervisorctl status`

### 7. Final Testing (10 minutes)
- [ ] Open browser: `http://your-ec2-ip`
- [ ] Test dealer login
- [ ] Test admin login
- [ ] Test product creation
- [ ] Test image upload

### 8. Domain & SSL (Optional - 15 minutes)
- [ ] Point domain to EC2 IP
- [ ] Run certbot for SSL
- [ ] Test HTTPS access

---

## 🔑 Important Information to Save

**RDS Endpoint:**
```
_____________________________________________
```

**RDS Password:**
```
_____________________________________________
```

**EC2 Public IP:**
```
_____________________________________________
```

**EC2 Key File Location:**
```
_____________________________________________
```

**SSH Command:**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

---

## 📞 Support Resources

**AWS Documentation:**
- RDS: https://docs.aws.amazon.com/rds/
- EC2: https://docs.aws.amazon.com/ec2/

**Application Support:**
- Backend logs: `/var/log/supplysync-backend.out.log`
- Nginx logs: `/var/log/nginx/error.log`
- Supervisor: `sudo supervisorctl status`

---

## 💰 Cost Estimate

- RDS db.t3.micro: ~$15/month
- EC2 t3.small: ~$15/month
- Data transfer: ~$5-10/month
- **Total: ~$35-40/month**

---

## 🎯 Expected Timeline

- First-time setup: 2-3 hours
- Subsequent updates: 5-10 minutes
- With practice: < 1 hour

---

**Good luck with your deployment!** 🚀
