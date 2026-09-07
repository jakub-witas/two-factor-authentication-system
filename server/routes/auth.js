const express = require("express");
const bcrypt = require("bcryptjs");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const { Users } = require("../models/models");
const router = express.Router();
const { blacklistedTokens } = require("../config/tokenStore");
const { authenticateToken, validateInput, createTempSession, verifyTempSession, loginLimiter, authLimiter, loginOTPLimiter, loginBIOLimiter } = require("../config/helpers");


router.post("/register", validateInput, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await Users.findOne({ where: { email: email } });

    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await Users.create({
      email: email,
      name: name,
      password: hashedPassword
    });

    console.log("Created user with id: ", newUser.id);
    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", validateInput, loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/checkexists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-Server-Secret': process.env.SERVER_SECRET
      },
      body: JSON.stringify({ id: findUser.id, email })
    });

    if (response.ok) {
      const data = await response.json();

      const tempSessionId = await createTempSession(findUser.id, data.method);

      return res.json({ requires2FA: true, method: data.method, tempSessionId });
    } else if (response.status === 400) {
      return res.status(400).json({ message: "Invalid request for 2FA" });
    } else if (response.status === 410) {
      console.log('Conn refused - secret mismatched');
      return res.status(500).json({ message: "Server error" });
    } else if (response.status !== 401) {
      return res.status(500).json({ message: "Server error" });
    }

    const token = jwt.sign({ email: email, name: findUser.name }, process.env.JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ requires2FA: false, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/biometricLogin", validateInput, loginBIOLimiter, async (req, res) => {
  try {
    const { tempSessionId, email, method } = req.body;

    const sessionData = await verifyTempSession(tempSessionId);

    if (sessionData == null) {
      return res.status(400).json({ message: "Session expired or invalid" });
    }

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (findUser.id != sessionData.userId || method != sessionData.method) {
      return res.status(400).json({ message: "Session mismatched" })
    }

    const token = jwt.sign({ email: email, name: findUser.name }, process.env.JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/otplogin", validateInput, loginOTPLimiter, async (req, res) => {
  try {
    const { tempSessionId, email, method, code } = req.body;
    const sessionData = await verifyTempSession(tempSessionId);
    if (sessionData == null) {
      return res.status(400).json({ message: "Session expired or invalid" });
    }

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (findUser.id != sessionData.userId || method != sessionData.method) {
      return res.status(400).json({ message: "Session mismatched" })
    }

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/confirmOTPcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-Server-Secret': process.env.SERVER_SECRET
      },
      body: JSON.stringify({ id: findUser.id, code })
    });

    if (response.status === 410) {
      console.log('Conn refused - secret mismatched');
      return res.status(500).json({ message: "Server error" });
    } else if (!response.ok) {
      return res.status(401).json({ error: "Invalid 2FA code." });
    }

    const token = jwt.sign({ email: email, name: findUser.name }, process.env.JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ token: token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/changePassword", authenticateToken, validateInput, async (req, res) => {
  try {
    const { email, password, newPassword } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = bcrypt.compare(password, findUser.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await findUser.update({
      password: hashedPassword
    })

    res.status(200).json({ message: 'Password change successful' });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/changeEmail", authenticateToken, validateInput, async (req, res) => {
  try {
    const { email, password, newEmail } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = bcrypt.compare(password, findUser.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    await findUser.update({
      email: newEmail
    })

    res.status(200).json({ message: 'Email change successful' });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/deleteAccount", authenticateToken, validateInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = bcrypt.compare(password, findUser.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-Server-Secret': process.env.SERVER_SECRET
      },
      body: JSON.stringify({ id: findUser.id })
    });

    if (response.status === 410) {
      console.log('Conn refused - secret mismatched');
      return res.status(500).json({ message: "Server error" });
    } else if (!response.ok) {
      return res.status(401).json({ message: "Error deleting auth" });
    }

    await Users.destroy({ where: { id: findUser.id } })

    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!req.headers.authorization) return res.status(401).json({ message: "Authorization header is missing" });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Token is missing" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const now = Math.floor(Date.now() / 1000);

    if (decoded.exp && decoded.exp > now) {
      blacklistedTokens.add(token);

      const ttl = (decoded.exp - now) * 1000;
      setTimeout(() => blacklistedTokens.delete(token), ttl);
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/2fa/enable", authenticateToken, validateInput, authLimiter, async (req, res) => {
  try {
    const { email, method, password } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = bcrypt.compare(password, findUser.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/enable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-Server-Secret': process.env.SERVER_SECRET
      },
      body: JSON.stringify({ id: findUser.id, method, email: findUser.email })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json(data);
    } else if (response.status === 410) {
      console.log('Conn refused - secret mismatched');
      return res.status(500).json({ message: "Server error" });
    } else if (response.status === 500) {
      return res.status(500).json(data);
    } else {
      return res.status(400).json(data);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/confirm", authenticateToken, authLimiter, async (req, res) => {
  try {
    const { code, email } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-Server-Secret': process.env.SERVER_SECRET
      },
      body: JSON.stringify({ id: findUser.id, code })
    });

    if (!response.ok) {
      if (response.status === 401) return res.status(401).json({ message: "Invalid code" });
      else if (response.status === 410) {
        console.log('Conn refused - secret mismatched');
        return res.status(500).json({ message: "Server error" });
      } else if (response.status === 500) return res.status(500).json(data);

    } else return res.status(400).json(false);

    return res.status(200).json({ success: true, message: "2FA enabled successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/remove", authenticateToken, validateInput, authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({
        message: "User with this email address was not found.",
      });
    }

    const isPasswordCorrect = bcrypt.compare(password, findUser.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/remove`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        'X-Server-Secret': process.env.SERVER_SECRET
      },
      body: JSON.stringify({ id: findUser.id })
    });

    if (response.ok) {
      return res.status(200).json({ message: "Removal successful" });
    } else if (response.status === 400) {
      return res.status(400).json({ message: "Invalid request" });
    } else if (response.status === 410) {
      console.log('Conn refused - secret mismatched');
      return res.status(500).json({ message: "Server error" });
    } else {
      return res.status(500).json({ message: "Server error" });
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;