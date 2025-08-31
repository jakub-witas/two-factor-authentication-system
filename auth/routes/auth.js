const express = require("express");
const { Auth } = require("../models/models");
const router = express.Router();
const { authenticator, hotp } = require("otplib");
const  send2FACodeEmail  = require("../config/mailService");
const { encryptSecret, decryptSecret } = require("../config/crypto");
const { createTempSecret, verifyTempSecret, 
        initHOTP, deleteHOTP, incrementHOTP, getHOTP, 
        storeHOTP, checkHOTP } = require('../config/helpers');


router.post("/checkexists", async(req, res) => {
try{
  const { id, email } = req.body;

  if(isNaN(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const exists = await Auth.findOne({ where: { user_id: id}});

  if(!exists) return res.status(401).json(false);

  if(exists.method === 'email'){
    const decryptedSecret = decryptSecret(exists.secret);
    const emailCode = hotp.generate(decryptedSecret, exists.counter);


    await storeHOTP(exists.user_id, exists.counter);

    const success = await send2FACodeEmail(email, emailCode);

    if(!success) {
      return res.status(400).json({ message: "Failed sending email" });
    }
  }
  return res.status(200).json({ method: exists.method});
} catch(error) {
  res.status(500).json({ message: "Server error" });
}
});

router.post("/confirmOTPcode", async(req, res) => {
try{
  const { id, code } = req.body;

  if(isNaN(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const exists = await Auth.findOne({ where: { user_id: id}});

  if(!exists) return res.status(401).json(false);

  const decryptedSecret = decryptSecret(exists.secret);
  let isValid;

  if(exists.method === 'email') {
    const timestamp  = await checkHOTP(id, exists.counter);

    if (!timestamp) {
      await exists.increment('counter'); 
      return res.status(401).json({ message: "Code expired or invalid" });
    }

     isValid = hotp.check(code, decryptedSecret, exists.counter);
  }
  else isValid = authenticator.check(code, decryptedSecret, { window: 1 });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid 2FA code." });
    }

    if(isValid && exists.method === 'email') {
      await exists.increment('counter');
    }
    
    return res.status(200).json(true);
} catch(error) {
  res.status(500).json({ message: "Server error" });
}
});

router.post("/remove", async(req, res) => {
try{
  const id = req.body.id;

  if(isNaN(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const exists = await Auth.findOne({ where: { user_id: id}});

  if(exists) await Auth.destroy({ where: { user_id: id }})
  
  return res.status(200).json({ message: "Authentication removed"});
} catch(error) {
  res.status(500).json({ message: "Server error" });
}
});

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.post("/enable", async (req, res) => {
  try{
    const { id, method, email } = req.body;

    const numericId = Number(id);
    if (!numericId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const exists = await Auth.findOne({ where: { user_id: id}});

    switch (method) {
      case 'biometrics': {
        if(!exists) {
          await Auth.create({
              user_id: id, 
              method: method
        });
      } else {
        await exists.update({
          method: method,
          secret: null,
        })
      } 

      return res.status(200).json({ requiresCode: false });
      } break;
      case 'email': {
        const secret = authenticator.generateSecret();
        await createTempSecret(id, method, secret, 300);
        const counter = await initHOTP(id, 300);

        const emailCode = hotp.generate(secret, counter);
        const success = await send2FACodeEmail(email, emailCode);

        if (!success) {
          return res.status(400).json({ message: "Failed sending email" });
        }

        if(!exists) {
          await Auth.create({
              user_id: id, 
              method: method,
         });
        } else {
          await exists.update({
            method: method,
            secret: null,
          })
        }

      return res.status(200).json({ requiresCode: true  });
      } break;
      case 'gauth': {
        const secret = authenticator.generateSecret();
        await createTempSecret(id, method, secret, 300);
        const otpAuth = authenticator.keyuri(email, "PracaMagisterska", secret);

        if(!exists) {
          await Auth.create({
              user_id: id, 
              method: method,
        });
      } else {
        await exists.update({
          method: method,
          secret: null,
          counter: null
        })
      }

      return res.status(200).json({ requiresCode: true, otpAuth });
      } break;
      default: {
        return res.status(400).json({ message: "Unknown method" });
      } break;
    }
    } catch(error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
});

router.post("/confirm", async (req, res) => {
  try{
    const { id, code } = req.body;

    const numericId = Number(id);
    if (!numericId) return res.status(400).json({ message: "Invalid user ID" });

    const exists = await Auth.findOne({ where: { user_id: id}});

    if (!exists ) { 
      return res.status(400).json({
        message: "User with this email address was not found or have no pending 2fa request.",
      });
    }

    const tempSecretData = await verifyTempSecret(id, exists.method);
    if (!tempSecretData) {
      return res.status(400).json({ message: "No pending 2FA request or code expired" });
    }
  
    let isValid;
    if(exists.method === 'email') {
      let counter = await getHOTP(id);
      if (!counter) return res.status(401).json({ message: "Code expired or invalid" });

      isValid = hotp.check(code, tempSecretData.secret, counter);
    }
    else if ((exists.method === 'gauth')) isValid = authenticator.check(code, tempSecretData.secret, { window: 1 });
    else return res.status(400).json({ message: "Method not recognised" });
      

    if(!isValid) {
      return res.status(401).json({ message: "Invalid 2FA code." });
    } else if(isValid && exists.method === 'email') {
      await incrementHOTP(id);
    }

    await Auth.update(
      { secret: await encryptSecret(tempSecretData.secret),
        counter: exists.method === "email" ? await getHOTP(id) : null
       },
      { where: { id: exists.id } }
    );

    if(exists.method === 'email') {
      await deleteHOTP(id);
    }

    return res.status(200).json({ success: true, message: "2FA enabled successfully" });
} catch (error) {
  console.log(error);
}
});

module.exports = router;