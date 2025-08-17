import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'dxl04rd4',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2024-08-17',
  token: 'skJZUB4jvTDuyzX0Rtbnt5bU6K6mw4lmiY93g7Dlw2GOT9tOikOYjlLU7BLyMFpMxwRw8a3N9iRWbXfohYJKkxMl2kGZy2GSiiShPBkxUl0X8QPnmDlMB0sYn2mf3DpZOfBqoCKsRJhe5I7zTdqxrtpXMrb2QwtAqAn4ZnKtqKFYM5mu6QSS'
});

async function debugSanityData() {
  try {
    console.log('=== Sanityデータ構造の確認 ===');
    
    // 全てのドキュメントを取得
    const allDocs = await client.fetch('*');
    console.log('全ドキュメント数:', allDocs.length);
    
    // 各ドキュメントのタイプを確認
    const docTypes = {};
    allDocs.forEach(doc => {
      const type = doc._type || 'undefined';
      docTypes[type] = (docTypes[type] || 0) + 1;
    });
    
    console.log('ドキュメントタイプ別の数:', docTypes);
    
    // 各ドキュメントの詳細を表示
    allDocs.forEach((doc, index) => {
      console.log(`\n--- ドキュメント ${index + 1} ---`);
      console.log('ID:', doc._id);
      console.log('Type:', doc._type);
      console.log('Keys:', Object.keys(doc));
      
      if (doc.title) {
        console.log('Title:', doc.title);
      }
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

debugSanityData();

