import { fail } from '@sveltejs/kit';
import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_TO
} from '$env/dynamic/private';

      });
    }

    // --- メール送信処理 ---
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465, // ポート465の場合はtrue, それ以外はfalse
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      const mailOptions = {
        from: `"脳トレ日和 お問い合わせ" <${SMTP_USER}>`,
        to: MAIL_TO,

以下の内容でお問い合わせがありました。

-----------------------------------------
お名前:
${name}

メールアドレス:
${email}

件名:
${subject}

お問い合わせ内容:
${message}
-----------------------------------------

          <p>以下の内容でお問い合わせがありました。</p>
          <hr>
          <h3>お名前</h3>
          <p>${name}</p>
          <h3>メールアドレス</h3>
          <p>${email}</p>
          <h3>件名</h3>
          <p>${subject}</p>
          <h3>お問い合わせ内容</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>

      };

      await transporter.sendMail(mailOptions);

      return { success: true };

    } catch (e) {
      console.error('メール送信中にエラーが発生しました:', e);
      return fail(500, {

