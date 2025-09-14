import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  useCdn: false,
  apiVersion: process.env.SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_READ_TOKEN
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
