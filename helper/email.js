const nodeMailer = require('nodemailer');

const sendMail = async (options) => {
  // Validate that a recipient email is provided
  if (!options.email) {
    throw new Error('Recipient email is required.');
  }
  // Create the transporter using Gmail service
  const transporter = await nodeMailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, 
    }
  });

  // Setup email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  try {
    // Send the email
    let info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendMail;


// const nodeMailer = require('nodemailer');

// const sendMail = async ( options )=>{
  
//     const transporter = await nodeMailer.createTransport({
//        service: "gmail",

//         secure: true, // true for port 465, false for other ports
//         auth: {
//           user: process.env.EMAIL_USER,
//           pass: process.env.EMAIL_PASS,
//         },
//         tls: {
//             rejectUnauthorized: false, // Bypass SSL verification
//           }        
//       });

//       const mailOption = {
//         subject: options.subject, text:options.text, from:process.env.EMAIL_USER, to: options.email, html:options.html
//       };
//       await transporter.sendMail(mailOption)

// }
// module.exports = sendMail;
