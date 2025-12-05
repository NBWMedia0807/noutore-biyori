import { fail } from '@sveltejs/kit';
import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_TO
} from '$env/dynamic/private';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const actions = {
  default: async ({ request }) => {
    // 必須の環境変数が設定されているかチェック
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
      console.error('メール送信に必要な環境変数が設定されていません。');
      return fail(500, {
        errors: { general: 'サーバー側の設定エラーにより、現在お問い合わせを送信できません。' }
      });
    }

    const data = await request.formData();
    const name = data.get('name');
    const email = data.get('email');
    const subject = data.get('subject');
    const message = data.get('message');

    // --- バリデーション ---
    const errors = {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'お名前を入力してください。';
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.email = 'メールアドレスを入力してください。';
    } else if (!emailPattern.test(email.trim())) {
      errors.email = 'メールアドレスの形式が正しくありません。';
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      errors.subject = 'お問い合わせ種別を選択してください。';
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      errors.message = 'お問い合わせ内容を入力してください。';
    } else if (message.trim().length < 10) {
      errors.message = '10文字以上で詳しい内容をご記入ください。';
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        data: { name, email, subject, message },
        errors
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
        replyTo: email, // 「返信」した際に、ユーザーのメールアドレスが宛先になるように設定
        subject: `【お問い合わせ】${subject} - ${name}様より`,
        text: `
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
`,
        html: `
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
        `
      };

      await transporter.sendMail(mailOptions);

      return { success: true };

    } catch (e) {
      console.error('メール送信中にエラーが発生しました:', e);
      return fail(500, {
        data: { name, email, subject, message },
        errors: { general: 'サーバーエラーにより、お問い合わせを送信できませんでした。しばらくしてから再度お試しください。' }
      });
    }
  }
};