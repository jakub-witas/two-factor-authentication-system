const express = require("express");
const bcrypt = require("bcryptjs");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { Users } = require("../models/models");
const router = express.Router();
const { blacklistedTokens } = require("../config/tokenStore"); 
const { body, validationResult } = require("express-validator");
const { authenticator } = require("otplib");
const redis = require("../config/redisClient");
const { v4: uuidv4 } = require("uuid");


const authenticateToken = (req, res, next) => {
    const  authHeader = req.headers.authorization;
    
    if(!req.headers.authorization) return res.status(401).json({ message: "Authorization header is missing" });
    
    const token = authHeader.split(' ')[1];
    if(!token) return res.status(401).json({ message: "Token is missing" });

    if (blacklistedTokens.has(token)) {
      console.log("Usage of unauthorised token!");
      return res.status(403).json({ message: "Token is blacklisted" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.body.email = decoded.email;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(403).json({ message: "Invalid or expired token", tokenExpired: true });
    }
};

const validateInput = [
  body('email')
    .isEmail()
    .optional()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

    body('newEmail')
    .isEmail()
    .optional()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

      body('password')
      .optional()
        .isString()
        .withMessage('Password must be a string.')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long.')
        .trim(),

        body('newPassword')
      .optional()
        .isString()
        .withMessage('Password must be a string.')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long.')
        .trim(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

async function createTempSession(userId, method) {
  const tempSessionId = uuidv4();

  const sessionData = JSON.stringify({
    userId: userId.toString(),
    method
  });

  await redis.setEx(`tempSession:${tempSessionId}`, 300, sessionData);

  return tempSessionId;
}

async function verifyTempSession(tempSessionId) {
  const sessionData = await redis.get(`tempSession:${tempSessionId}`);

  if (!sessionData) {
    return null;
  }
  
  await redis.del(`temp:${tempSessionId}`);

  return JSON.parse(sessionData);
}

router.post("/register",validateInput, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await Users.findOne({ where: { email: email } });
    
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    
     const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = await  Users.create({
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

// Login
router.post("/login",validateInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await Users.findOne({where: { email: email }});

    if(!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/checkexists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: findUser.id, email })
    });

    if(response.ok) {
      const data = await response.json();

      const tempSessionId = await createTempSession(findUser.id, data.method);

      return res.json({ requires2FA: true, method: data.method, tempSessionId });
    } else if (response.status === 400) {
      return res.status(400).json({ message: "Invalid request for 2FA"});
    }

    const token = jwt.sign({ email: email, name: findUser.name}, process.env.JWT_SECRET, { expiresIn: "15m" });
    
    return res.status(200).json({ requires2FA: false, token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/biometricLogin", async (req, res) => {
  try{
    const { tempSessionId, email, method } = req.body;

    const sessionData = await verifyTempSession(tempSessionId);

    if (sessionData == null) {
      return res.status(400).json({ message: "Session expired or invalid" });
    }

    const findUser = await Users.findOne({where: { email: email }});
    
    if(!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if(findUser.id != sessionData.userId || method != sessionData.method) {
      return res.status(400).json({ message: "Session mismatched" })
    } 

    const token = jwt.sign({ email: email, name: findUser.name}, process.env.JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/otplogin", async (req, res) => {
  try {
    const { tempSessionId, email, method, code } = req.body;
    const sessionData = await verifyTempSession(tempSessionId);
    if (sessionData == null) {
      return res.status(400).json({ message: "Session expired or invalid" });
    }

    const findUser = await Users.findOne({where: { email: email }});
    
    if(!findUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if(findUser.id != sessionData.userId || method != sessionData.method) {
      return res.status(400).json({ message: "Session mismatched" })
    } 

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/confirmOTPcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: findUser.id, code })
    });

    if(!response.ok) {
      return res.status(401).json({ error: "Invalid 2FA code." });
    }

    const token = jwt.sign({ email: email, name: findUser.name}, process.env.JWT_SECRET, { expiresIn: "15m" });

    return res.status(200).json({ token: token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/changePassword", authenticateToken, validateInput, async (req, res) => {
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
    res.status(500).json({ message: "Server error or invalid token." });
  }
});

router.post("/changeEmail", authenticateToken, validateInput, async (req, res) => {
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
    res.status(500).json({ message: "Server error or invalid token." });
  }
});

router.post("/deleteAccount", authenticateToken, validateInput, async (req, res) => {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: findUser.id })
    });

    if(!response.ok) {
      return res.status(401).json({ message: "Error deleting auth" });
    }

    await Users.destroy({ where: { id: findUser.id }})

    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: "Server error or invalid token." });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.post("/logout", async (req, res) => {
  try {
    const  authHeader = req.headers.authorization;
    
    if(!req.headers.authorization) return res.status(401).json({ message: "Authorization header is missing" });
    
    const token = authHeader.split(' ')[1];
    if(!token) return res.status(401).json({ message: "Token is missing" });

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
    res.status(500).json({ message: "Server error or invalid token." });
  }
});


router.post("/2fa/enable",  authenticateToken, validateInput, async (req, res) => {
  try{
      const {email, method, password} = req.body;

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: findUser.id, method, email: findUser.email })
    });

    const data = await response.json();

    if(response.ok){ 
      return res.status(200).json( data );
  } else {
     return res.status(400).json( data );
  }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/2fa/confirm", authenticateToken, async (req, res) => {
  try{
    const { code, email } = req.body;

    const findUser = await Users.findOne({ where: { email: email } });

    if (!findUser) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const response = await fetch(`${process.env.AUTH_API_URL}/2fa/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: findUser.id, code })
      });

  if(!response.ok) {
    if(response.status === 401) return res.status(401).json({ message: "Invalid code" });
    else return res.status(400).json( false );
  } 

  return res.status(200).json({ success: true, message: "2FA enabled successfully" });
} catch (error) {
  console.log(error);
  res.status(500).json({ message: "Server error" });
}
});

router.post("/2fa/remove", authenticateToken, async (req, res) => {
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: findUser.id })
    });

    if(response.ok) {
      return res.status(200).json({ message: "Removal successful" });
    } else if (response.status === 400) {
      return res.status(400).json({ message: "Invalid request"});
    } else {
      return res.status(500).json({ message: "Server error"});
    }

} catch (error) {
  console.log(error);
  res.status(500).json({ message: "Server error" });
}
});

module.exports = router;