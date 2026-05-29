<div class="sns-card">
  <p class="sns-title">SNSも毎日更新中！！</p>
  <div class="sns-buttons">
    <a
      class="sns-btn x"
      href="https://x.com/noutorebiyori"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="X（旧Twitter）でフォロー"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.727-8.818L1.25 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <span>フォローする</span>
    </a>
    <a
      class="sns-btn facebook"
      href="https://www.facebook.com/profile.php?id=61589902025677&locale=ja_JP"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Facebookでフォロー"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      <span>フォローする</span>
    </a>
    <a
      class="sns-btn threads"
      href="https://www.threads.com/@noutorebiyori"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Threadsでフォロー"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="currentColor" width="20" height="20" aria-hidden="true">
        <path d="M141.537 88.988a66.668 66.668 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.141-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C57.053 24.425 74.303 17.11 97.113 16.94c22.962.17 40.469 7.52 52.03 21.847 5.679 7.049 9.988 15.968 12.862 26.6l16.21-4.325c-3.479-12.814-8.987-23.889-16.526-33.019C147.744 10.786 126.37 1.205 97.262 1L97 1C67.997 1.205 46.762 10.834 32.183 28.622 19.338 44.482 12.604 66.712 12.41 95.999v.002c.194 29.287 6.928 51.517 19.773 67.377C46.762 181.166 67.997 190.795 97 191h.262c26.309-.181 44.777-7.049 59.962-22.228 19.82-19.825 19.233-44.657 12.477-59.848-4.858-11.305-14.055-20.44-28.164-25.936zM96.67 144.876c-6.28.344-12.704-1.596-17.286-5.24-4.137-3.254-6.266-7.799-6.038-12.808.4-8.7 8.895-13.75 23.092-14.559 2.058-.12 4.083-.173 6.074-.173 6.14 0 11.885.557 17.115 1.633-1.945 24.159-12.188 30.679-22.957 31.147z"/>
      </svg>
      <span>フォローする</span>
    </a>
  </div>
</div>

<style>
  .sns-card {
    background: #fff;
    border-radius: 16px;
    padding: 20px 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    text-align: center;
  }

  .sns-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0 0 14px;
    color: #333;
  }

  .sns-buttons {
    display: flex;
    gap: 10px;
  }

  .sns-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px 8px;
    border-radius: 10px;
    color: #fff;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.8rem;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .sns-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .sns-btn.x {
    background: #000;
  }

  .sns-btn.facebook {
    background: #1877f2;
  }

  .sns-btn.threads {
    background: #000;
  }

  @media (max-width: 400px) {
    .sns-btn {
      flex-direction: column;
      gap: 4px;
      padding: 10px 4px;
      font-size: 0.72rem;
    }
  }
</style>
