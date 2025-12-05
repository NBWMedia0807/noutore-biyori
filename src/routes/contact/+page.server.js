import { fail } from '@sveltejs/kit';
import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_TO
} from '$env/dynamic/private';

export const actions = {
  default: async ({ request }) => {
    // 必須の環境変数が設定されているかチェック
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
      console.error('メール送信に必要な環境変数が設定されていません。');
      return fail(500, {
        message: 'サーバー側の設定エラーにより、現在お問い合わせを送信できません。'
      });
    }

    const data = await request.formData();
    const name = data.get('name')?.toString();
    const email = data.get('email')?.toString();
    const subject = data.get('subject')?.toString() || '（件名なし）'; // subjectがなくてもOK
    const message = data.get('message')?.toString();

    // --- デバッグログ ---
    console.log('Contact form submission received:', { name, email, subject, message });

    // --- バリデーション（緩和版） ---
    if (!name || !email || !message) {
      return fail(400, {
        data: { name, email, subject, message },
        message: 'お名前、メールアドレス、お問い合わせ内容は必須です。'
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
        replyTo: email,
        subject: `【お問い合わせ】${subject} - ${name}様より`,
        text: "
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
",
        html: "
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
        "
      };

      await transporter.sendMail(mailOptions);

      return { success: true };

    } catch (e) {
      console.error('メール送信中にエラーが発生しました:', e);
      return fail(500, {
        message: 'サーバーエラーにより、お問い合わせを送信できませんでした。しばらくしてから再度お試しください。'
      });
    }
  }
};
