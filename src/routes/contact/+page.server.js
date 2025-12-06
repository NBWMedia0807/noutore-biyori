import { fail } from '@sveltejs/kit';
import nodemailer from 'nodemailer';
// 【重要】ビルドエラーを防ぐため、envオブジェクトとしてまとめて読み込む
import { env } from '$env/dynamic/private';

export const actions = {
	default: async ({ request }) => {
		// envオブジェクトから動的に値を取り出す
		const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_TO } = env;

		// --- 環境変数チェック ---
		if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
			console.error('One or more SMTP environment variables are not set.');
			return fail(500, {
				success: false,
				message: 'サーバー側の設定エラーにより、現在お問い合わせを送信できません。'
			});
		}

		const formData = await request.formData();
		const name = formData.get('name');
		const email = formData.get('email');
		const subject = formData.get('subject') || '（件名なし）';
		const message = formData.get('message');

		// デバッグ用ログ
		console.log(`Received inquiry from: ${email}`);

		const data = { name, email, subject, message };
		const errors = {};

		// --- バリデーション ---
		if (!name) errors.name = 'お名前は必須です。';
		
		if (!email) {
			errors.email = 'メールアドレスは必須です。';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			// シンプルかつ一般的なメールアドレス検証
			errors.email = '有効なメールアドレスを入力してください。';
		}
		
		if (!message) errors.message = 'お問い合わせ内容は必須です。';

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				success: false,
				message: '入力内容に誤りがあります。',
				data,
				errors
			});
		}

		// --- メール送信処理 ---
		try {
			const transporter = nodemailer.createTransport({
				host: SMTP_HOST,
				port: Number(SMTP_PORT),
				secure: Number(SMTP_PORT) === 465, 
				auth: {
					user: SMTP_USER,
					pass: SMTP_PASS
				}
			});

			const mailOptions = {
				from: `"お問い合わせ" <${SMTP_USER}>`,
				to: MAIL_TO,
				replyTo: email,
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

			return {
				success: true,
				message: 'お問い合わせいただきありがとうございます。'
			};
		} catch (error) {
			console.error('Error sending email:', error);
			return fail(500, {
				success: false,
				message: 'サーバーエラーにより、お問い合わせを送信できませんでした。',
				data
			});
		}
	}
};