import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendUserEmail = async (
  email: string,
  content: string,
  subject: string
) => {
  try {
    const mailOptions = {
      from: `"Admin Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: content,
    };

    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

// email templates

// 1. form assignment

interface EmailTemplateData {
  name?: string;
  email?: string;
  activationCode?: string;
  password?: string;
}
interface FormAssignTemplateData {
  name: string;
  formName: string;
  formLink: string;
}

const emailTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      .container {
              font-family: 'Arial', sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
              border-radius: 10px;
            }
            .header {
              background-color: #4a90e2;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 20px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .credentials {
              background-color: #f8f9fa;
              padding: 15px;
              margin: 15px 0;
              border-left: 4px solid #4a90e2;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
            .warning {
              color: #dc3545;
              font-size: 14px;
              margin-top: 15px;
            }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <!-- Header content will be inserted here -->
      </div>
      <div class="content">
        <!-- Content will be inserted here -->
      </div>
    </div>
  </body>
  </html>
`;

export const form_assignment_email_template = (
  data: FormAssignTemplateData
): string => {
  const { name, formName, formLink } = data;
  // Insert header content
  const headerContent = `
  <h1>Welcome, ${name}!</h1>
`;

  // Insert content
  const content = `
    <p>You were assigned to the form ${formName.toUpperCase()}</p>
    <p>Click the link below to access the form:</p>
    <a href="${formLink}">Access Form</a>
`;

  // Replace placeholders with actual content
  const template = emailTemplate
    .replace("<!-- Header content will be inserted here -->", headerContent)
    .replace("<!-- Content will be inserted here -->", content);

  return template;
};
