const nodemailer = require('nodemailer');
const config = require('config');

const sendOtpEmail = async (email, otp) => {
  try {
    let transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'azamk37731@gmail.com',//config.get('emailUser'), 
        pass: 'luii ppkw vdvr cqxj'//config.get('emailPass'), 

        

      },
      tls: {
        rejectUnauthorized: false,
    },
    });

    // Email options
    let mailOptions = {
      from: 'azamk37731@gmail.com', // sender address
      to: email, // list of receivers
      subject: 'Your OTP Code', // subject line
      text: `Your OTP code is ${otp}`, // plain text body
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Error sending OTP email');
  }
};

module.exports = sendOtpEmail;
