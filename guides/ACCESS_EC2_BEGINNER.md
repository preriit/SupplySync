# 🖥️ Access EC2 Server - Beginner's Guide (No SSH Knowledge Needed!)

## Method 1: EC2 Instance Connect (Easiest - Browser-Based)

**No SSH key needed! Access directly from browser.**

### Step 1: Navigate to EC2
1. In AWS Console, search for "EC2" at the top
2. Click "EC2" service
3. On the left sidebar, click "Instances"
4. You should see your 2 instances:
   - "Supply Sync" (i-0dfc7701937a53979)
   - Unnamed (i-0e2ce9d8fa04ad73a)

### Step 2: Connect via Browser
1. Click the checkbox next to "Supply Sync" instance
2. Click the "Connect" button at the top
3. You'll see 4 tabs - click "EC2 Instance Connect"
4. Username should show: `ubuntu` (or might say `ec2-user`)
5. Click "Connect" button

**✅ Success:** A terminal window opens in your browser!

**❌ If it fails:** Try Method 2 below

---

## Method 2: Session Manager (Alternative - Also Browser-Based)

1. Follow Step 1 above (get to EC2 Instances)
2. Click checkbox next to "Supply Sync"
3. Click "Connect" button
4. Click "Session Manager" tab
5. Click "Connect"

---

## Once Connected (Terminal Opens):

You'll see a black screen with text. This is the Linux terminal!

**Type these commands exactly** (press Enter after each):

```bash
# 1. Check where you are
pwd

# 2. List files
ls -la

# 3. Find Django app
sudo find / -name "manage.py" 2>/dev/null
```

**Share with me:**
- What does `pwd` show?
- What does `ls -la` show?
- What path did `find` show for manage.py?

This tells us where the Django app is installed!

---

## Step 3: Export the Database

Once I know where the app is, I'll give you exact commands to:
1. Export the PostgreSQL database
2. Download it to your computer
3. We'll analyze it together

**For now, just get connected and share the output of those 3 commands above!**

---

## ⚠️ Troubleshooting

**"Connect button is greyed out":**
- The instance might be stopped. Status should show "Running" in green.

**"Connection timeout":**
- Try the other instance (unnamed one)
- Or wait 2-3 minutes and try again

**"Permission denied":**
- Try username: `ec2-user` instead of `ubuntu`

---

## 📸 What to Share with Me

1. Screenshot of EC2 Instances page
2. Output of the 3 commands above
3. Any error messages you see

Then I'll guide you to export the database!
