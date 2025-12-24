const admin = require("firebase-admin");
require("dotenv").config();

let bucket = null;
const initializeFirebase = () => {
  if (!bucket) {
    try {
      // const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      const serviceAccount = {
        type: "service_account",
        project_id: "iabaapp",
        private_key_id: "1badde2972235fef20574baf0eeab0b4180bac17",
        private_key:
          "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCmhQFBS7QvS4Hv\naCb3G4RbsIgDx7fsz+lYWkFCYqzL0rqn7urzs/SxDPPwPuWYfIIPAyS9/4+oyBRx\nE+EW+Ju9952kJuQmnAfoVnMQ20rI63ByjzbiZbRMICO4RXgtVNTj/5eH8GryOLom\nb0oRyTOOHo/50TQvVUIEhLVxTbWm1JK1b5YnU3GYNhjirPGcPmn+a6GWS8aT1tEF\nY7FWqpCHP0GibTshUCePSx53JLB7IYY4FbsBZ1TrCSxRChmuyLmGfwI2W46Tg/dy\n4RkK78+SdXcU5QK8ydGGxC4cyIfnh0HL/2fITfoj15FB9bLppWjvRHb0i5/Zilg0\n/qbRxqyRAgMBAAECggEADRwIgsL6fwSzSI1LEAY3D97gfmexR7AAn2ePnrHVB8Dh\n2Am7ro760xuBcucIvU4EETl+oYSmozOJRHO7s0rEPBrr6rnzGUUMbFKuAWQ6SYIb\nmrFCsWUvYhTfqwixEuSMVBzRqa6YRNSJdzAoxSixad1nGVRKhvVv2po2DKMBC46t\nILemkHD8eMrdKk+MTO5LnYkfbcOSsjUd+MTbOY6M3UcjMz0kCB7WjKF7hnHo6MlU\nffFAoEkhnoNaYZBvO9ukPfWgnpvv8XI19lQ77G7ZRM9YMNaaS44MO5x8n8jB+ki0\nTtW5AcvkSdbGCMADv4sMpq2qKmmIRTmPGsWwJMxSLwKBgQDcFluLqQ+dkz2FmF90\nFCTWSWjx5xAEXQ/sqS8j8MqSUkwUlpmBfUbSBulyMduRBTeWn3fNn2MRiXaTPqzK\nN3sxX8yKhJ7M93V517QcUH3lZ4eqNYuT9WJeLOOtDj8Lg89axiNWNvaKB2db+aVu\nhrihkCeqKamebVDrRCgwIFfA1wKBgQDBsPntqTsf64AuaOfrHL+Rrl/xjpXQ3KgS\nI0DVOSGj9i8dWTaGP8qVsHh9NlqlHqARH7ZimgWO131EjYxh4mILKQ94mbhDafw2\nFLpolnvaW1MrD8k2tCK3awJByAlviV5pyX+wcOv2fOQex6dYbc0WrGApvx0div7W\nCdSOu7sI1wKBgEWn9dVf7odKwJ/1t9A/R+FiXoqhPNqEsbOPYFIZtaNV1Kp3d6Ia\nCj4S3fO8f+eIJS3QztQPbAVy4kp7/agKozzfOxdkHfZ1I4Mql+CWQSJIABII3GI5\nuaZgwrZU2fNFBm2OZES3JJRO/5GGk6tFjE3mGAetI/f2VTQA4E9LDTsFAoGAYKAf\nLna8LiJX4c8n01yWHOD2sBTHnFhX6CR6FWTY6WjI/EUjNDnioGZW1XAmLDVo+OHv\nJKVdnHLX5TkQDUzYSGUFeM6G4+qdjYUtsTtRMg9ZICRR5t5aa1IQ4CwguOm4leGV\nt7m9nUuUqd5EF5M/Os5ncqwKpFBQ7QoeZc41ciUCgYAKIcVMBY4l+8fxPouEH33n\nfHkTx0QEBgco8N51HIqVGiBkTECZfU2oGDDYb5QEsSc82Szk/xz+NOuRs+EN/Krs\n4NGx9fmMLbOryfJFyCiM+85BH8dec5pzh19EpjqacsXhwrsVjNjqoUhWOfR9B/J/\nqCRdaVnlAlaiaAVJIdPZwQ==\n-----END PRIVATE KEY-----\n",
        client_email: "firebase-adminsdk-fbsvc@iabaapp.iam.gserviceaccount.com",
        client_id: "102814795033394040453",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:
          "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40iabaapp.iam.gserviceaccount.com",
        universe_domain: "googleapis.com",
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "iabaapp.firebasestorage.app",
      });

      bucket = admin.storage().bucket();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      throw error;
    }
  }
  return bucket;
};

const getBucket = () => {
  if (!bucket) {
    throw new Error("Firebase has not been initialized");
  }
  return bucket;
};

module.exports = { initializeFirebase, getBucket };
