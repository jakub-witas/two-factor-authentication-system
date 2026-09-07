import * as LocalAuthentication from 'expo-local-authentication';
import { jwtDecode } from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = "http://192.168.100.114:3000/api";

export async function login(email, password) {
  try{
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: ({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password })
  });
  return res;
  } catch (error) {
    console.log(error);
  }
}

export async function register(name, email, password) {
  try{
  const res = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
   headers: ({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, email, password })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Registration failed");
  }
  return true;
  } catch (error) {
    console.log(error);
  }
}

export async function logout() {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              })
  });

  if (res.ok) {
    clearUserSession();
    return true;
  } else {
    const data = await res.json();
    throw new Error(data.message || "Logout failed");
  }

  } catch (error) {
    console.log(error);
  }
}

export const handleBiometricLogin = async () => {
  try {
        const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Potwierdź swoją tożsamość',
        fallbackLabel: 'Użyj hasła',
        cancelLabel: 'Anuluj',
        disableDeviceFallback: false,
        });

        return result;
} catch (error) {
  console.log(error);
}
}

export async function confirmBiometricLogin(email, method, tempSessionId) {
  try{
    const res = await fetch(`${API_BASE_URL}/2fa/biometricLogin`, {
      method: "POST",
      headers: ({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email, method, tempSessionId })
    });
  return res;
  } catch (error) {
    console.log(error);
  }
}

export const checkBiometricAuthSupport = async () => {
  try{
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    
    if(!compatible || !enrolled) return false;

    return true;
  } catch (error) {
    console.log("Biometric check failed:", error);
    return false;
  }
};


export async function handleOTPlogin(method, email, tempSessionId, code) {
  try{
    const res = await fetch(`${API_BASE_URL}/2fa/otplogin`, {
      method: "POST",
      headers: ({ "Content-Type": "application/json" }),
      body: JSON.stringify({ email, method, tempSessionId, code })
    });
  return res;
  } catch (error) {
    console.log(error);
  }
}

export const enable2fa = async (method, password) => {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/2fa/enable`, {
    method: "POST",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }),
    body: JSON.stringify ({ password, method })
  });

  return res;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const sendConfirmCode = async (code) => {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/2fa/confirm`, {
    method: "POST",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }),
    body: JSON.stringify ({ code })
  });

  return res;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const remove2fa = async (password) => {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/2fa/remove`, {
    method: "POST",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }),
    body: JSON.stringify ({ password })
  });

  if(res.ok) return true;
  else if(res.status == 401) return "invalid password";
  else return false;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const changeEmail = async (password, newEmail) => {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/changeEmail`, {
    method: "PUT",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }),
    body: JSON.stringify ({ password, newEmail })
  });

  return res;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const changePassword = async (password, newPassword) => {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/changePassword`, {
    method: "PUT",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }),
    body: JSON.stringify ({ password, newPassword })
  });

  return res;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const deleteAccount = async (password) => {
  try{
  const token = await SecureStore.getItemAsync('userToken');

  const res = await fetch(`${API_BASE_URL}/deleteAccount`, {
    method: "DELETE",
    headers: ({ "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }),
    body: JSON.stringify ({ password })
  });

  return res;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const storeUserSession = async (token, method) => {
  try{
    const storedInfo = jwtDecode(token);  
    const name = storedInfo.name.trim().split(" ");

    if(method != null) await SecureStore.setItemAsync('selected2FA', method);
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userEmail', storedInfo.email);
    await SecureStore.setItemAsync('userName', name[0]);
    await SecureStore.setItemAsync('tokenExp', storedInfo.exp.toString());

    return true;
  } catch (error) {
    console.log("Failed at saving user session: ", error);
    return false;
  }
};

export const clearUserSession = async () => {
  try{
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userEmail');
    await SecureStore.deleteItemAsync('userName');
    await SecureStore.deleteItemAsync('tokenExp');
    await SecureStore.deleteItemAsync('selected2FA');
  } catch (error) {
    console.log("Failed at clearing user session: ", error);
    return false;
  }
};