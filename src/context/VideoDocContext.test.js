import React from 'react';
import { render } from '@testing-library/react-native';
import { DataProvider, DataContext } from './VideoDocContext'; 
import { AuthContext } from './AuthContext';

function TestComponent({ callback }) {
  const value = React.useContext(DataContext);
  callback(value);
  return null;
}

describe('DataContext (React Native)', () => {
  test('mapPexelsItems converts one video item', () => {
    let ctx = null;

    // ⬅️ Wrap DataProvider with AuthContext.Provider
    render(
      <AuthContext.Provider value={{ idToken: null }}>
        <DataProvider>
          <TestComponent callback={(v) => (ctx = v)} />
        </DataProvider>
      </AuthContext.Provider>
    );

    const items = ctx.mapPexelsItems([
      {
        id: 1,
        user: { name: 'Alice' },
        image: 'img1',
        video_files: [{ file_type: 'video/mp4', quality: 'hd', width: 1920, link: 'hd-link' }],
      },
    ]);

    expect(items[0]).toMatchObject({
      id: '1',
      title: 'Video by Alice',
      thumbnail: 'img1',
      url: 'hd-link',
    });
  });

  test('mapDocsItems converts one file item', () => {
    let ctx = null;

    render(
      <AuthContext.Provider value={{ idToken: null }}>
        <DataProvider>
          <TestComponent callback={(v) => (ctx = v)} />
        </DataProvider>
      </AuthContext.Provider>
    );

    const docs = [
      {
        type: 'file',
        name: 'report.pdf',
        size: 2048,
        download_url: 'https://download/report.pdf',
      },
    ];

    const items = ctx.mapDocsItems(docs);

    expect(items[0]).toMatchObject({
      name: 'report.pdf',
      type: 'pdf',
      size: '2 KB',
      url: 'https://download/report.pdf',
    });
  });
});
