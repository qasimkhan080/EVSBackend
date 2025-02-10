const nodemailer = require('nodemailer');

const sendOtpEmail = async (email, otp) => {
  try {
    let transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'azamk37731@gmail.com',
        pass: 'luii ppkw vdvr cqxj'

      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    let mailOptions = {
      from: 'azamk37731@gmail.com',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Error sending OTP email');
  }
};

module.exports = sendOtpEmail;
