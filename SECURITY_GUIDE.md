# 🔐 EMERGENCY: Secure Your AWS Account

## ⚠️ EXPOSED CREDENTIALS (In Public GitHub)

```
AWS_ACCESS_KEY_ID = 'AKIAQBE7VRFSBF5EMZST'
AWS_SECRET_ACCESS_KEY = 'J+rY0LqfirfbdczOZDs1Xp+Xk810y/oWTxb7tycM'
```

**Risk Level:** 🔴 CRITICAL - Anyone can access your S3 bucket!

---

## 📋 Step-by-Step: Rotate AWS Keys (15 minutes)

### **Step 1: Find the IAM User**

1. Go to AWS Console: https://console.aws.amazon.com/
2. In the search bar at top, type: **IAM**
3. Click **IAM** service
4. In left menu, click **"Users"**
5. Look for a user named something like:
   - `supplysync-user`
   - `django-app`
   - `admin`
   - Or your name
6. **📸 Take screenshot** - which users do you see?

### **Step 2: Check Access Keys**

1. Click on the user (any user that looks like it's for the app)
2. Click **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Do you see a key starting with: `AKIAQBE7VRFSBF5EMZST`?
   - ✅ YES → This is the exposed key!
   - ❌ NO → Try another user

### **Step 3: Delete the Exposed Key**

1. Find the key: `AKIAQBE7VRFSBF5EMZST`
2. Click **"Actions"** dropdown next to it
3. Click **"Deactivate"** first (safer)
4. Wait 5 minutes to see if site breaks
5. If site still works → Click **"Delete"**
6. Confirm deletion

**⚠️ WARNING:** Deleting this key WILL break S3 image uploads on your production site until we update the server with new keys.

### **Step 4: Create NEW Access Keys**

1. Still in the same user's Security credentials tab
2. Click **"Create access key"**
3. Select use case: **"Application running on AWS compute service"**
4. Click **"Next"**
5. Description: "New key for SupplySync - Jan 2026"
6. Click **"Create access key"**
7. **🚨 IMPORTANT:** Copy BOTH:
   - Access key ID: `AKIA...`
   - Secret access key: `abc123...`
8. **SAVE THESE SECURELY** - You'll never see the secret again!

### **Step 5: Update Your EC2 Server**

**Don't worry - we'll do this together in Phase 2!**

For now, just save the new keys in a secure note.

---

## 📝 Save Your New Keys Here:

```
NEW_AWS_ACCESS_KEY_ID = "_______________________"
NEW_AWS_SECRET_ACCESS_KEY = "_______________________"
```

**Where to save:**
- Password manager (LastPass, 1Password, Bitwarden)
- Encrypted note on your computer
- **NOT** in any code or GitHub!

---

## ✅ Checklist:

- [ ] Found IAM user
- [ ] Located exposed access key
- [ ] Deactivated old key
- [ ] Created new access key
- [ ] Saved new keys securely
- [ ] Ready for Phase 2 (updating EC2 server)

---

## 🔴 If You Get Stuck:

**Take screenshots and tell me:**
1. What step you're on
2. What you see on screen
3. What you're unsure about

I'll guide you through it!
