import React, {useCallback, useMemo, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  unstable_batchedUpdates,
} from 'react-native';
import {type WaterfallItem} from './WaterFall/ImageWaterFall';

interface DownloadedData {
  data: Set<string>;
  time: number;
}

interface TestImageProps {
  uri: string;
  id: string;
  downloaded: boolean;
  loadedCallback: () => void;
}

export function TestImage({
  uri,
  id,
  downloaded,
  loadedCallback,
}: TestImageProps) {
  return (
    <Image
      source={{uri: downloaded ? uri : 'not a downloaded'}}
      style={{width: 50, height: 50, borderRadius: 5, margin: 5}}
      resizeMode="cover"
      key={`img-${id}`}
      onLoad={loadedCallback}
    />
  );
}

export function ImageBandTest() {
  const prefetchTime = useRef(0);
  const [prefetchedNum, setPrefetchedNum] = useState(0);
  const prefetchedCallback = useCallback(() => {
    unstable_batchedUpdates(() => {
      setPrefetchedNum(prev => prev + 1);
    });
  }, []);
  const [downloadedData, setDownloadedData] = useState<DownloadedData>({
    data: new Set<string>(),
    time: 0,
  });
  const [loadedNum, setLoadedNum] = useState(0);
  const loadedCallback = useCallback(() => {
    unstable_batchedUpdates(() => {
      setLoadedNum(prev => prev + 1);
    });
  }, []);
  const pendingImageSet = useRef<Set<string>>(new Set<string>());
  const refreshLoadedImageTimeout = useRef<NodeJS.Timeout | null>(null);

  const photos: WaterfallItem[] = useMemo(
    () => [
      {uri: 'https://images.dog.ceo/breeds/mastiff-english/4.jpg', id: '1'},
      {
        uri: 'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_2002.jpg',
        id: '2',
      },
      {
        uri: 'https://images.dog.ceo/breeds/poodle-toy/n02113624_1801.jpg',
        id: '3',
      },
      {
        uri: 'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_4443.jpg',
        id: '4',
      },
      {
        uri: 'https://images.dog.ceo/breeds/ridgeback-rhodesian/n02087394_4761.jpg',
        id: '5',
      },
      {uri: 'https://images.dog.ceo/breeds/puggle/IMG_071023.jpg', id: '6'},
      {
        uri: 'https://images.dog.ceo/breeds/terrier-wheaten/n02098105_91.jpg',
        id: '7',
      },
      {
        uri: 'https://images.dog.ceo/breeds/setter-irish/n02100877_2832.jpg',
        id: '8',
      },
      {
        uri: 'https://images.dog.ceo/breeds/hound-walker/n02089867_3448.jpg',
        id: '9',
      },
      {
        uri: 'https://images.dog.ceo/breeds/australian-kelpie/Resized_20200416_142905_108884348190285.jpg',
        id: '10',
      },
      {
        uri: 'https://images.dog.ceo/breeds/corgi-cardigan/n02113186_6775.jpg',
        id: '11',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-border/n02093754_7726.jpg',
        id: '12',
      },
      {uri: 'https://images.dog.ceo/breeds/dhole/n02115913_38.jpg', id: '13'},
      {
        uri: 'https://images.dog.ceo/breeds/kelpie/n02105412_3905.jpg',
        id: '14',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spaniel-japanese/n02085782_1949.jpg',
        id: '15',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-norfolk/n02094114_297.jpg',
        id: '16',
      },
      {
        uri: 'https://images.dog.ceo/breeds/springer-english/n02102040_4295.jpg',
        id: '17',
      },
      {
        uri: 'https://images.dog.ceo/breeds/schnauzer-miniature/n02097047_2776.jpg',
        id: '18',
      },
      {
        uri: 'https://images.dog.ceo/breeds/pembroke/n02113023_11103.jpg',
        id: '19',
      },
      {
        uri: 'https://images.dog.ceo/breeds/setter-irish/n02100877_2989.jpg',
        id: '20',
      },
      {
        uri: 'https://images.dog.ceo/breeds/pitbull/IMG_20190826_121528_876.jpg',
        id: '21',
      },
      {
        uri: 'https://images.dog.ceo/breeds/danish-swedish-farmdog/ebba_001.jpg',
        id: '22',
      },
      {
        uri: 'https://images.dog.ceo/breeds/wolfhound-irish/n02090721_1690.jpg',
        id: '23',
      },
      {
        uri: 'https://images.dog.ceo/breeds/tervuren/yoda_on_terrace.jpg',
        id: '24',
      },
      {
        uri: 'https://images.dog.ceo/breeds/rottweiler/n02106550_1323.jpg',
        id: '25',
      },
      {
        uri: 'https://images.dog.ceo/breeds/keeshond/n02112350_9898.jpg',
        id: '26',
      },
      {
        uri: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_515.jpg',
        id: '27',
      },
      {uri: 'https://images.dog.ceo/breeds/gaddi-indian/Gaddi.jpg', id: '28'},
      {
        uri: 'https://images.dog.ceo/breeds/spaniel-blenheim/n02086646_3739.jpg',
        id: '29',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mastiff-tibetan/n02108551_4310.jpg',
        id: '30',
      },
      {
        uri: 'https://images.dog.ceo/breeds/samoyed/n02111889_16334.jpg',
        id: '31',
      },
      {
        uri: 'https://images.dog.ceo/breeds/pariah-indian/The_Indian_Pariah_Dog.jpg',
        id: '32',
      },
      {
        uri: 'https://images.dog.ceo/breeds/australian-kelpie/IMG_2599.jpg',
        id: '33',
      },
      {
        uri: 'https://images.dog.ceo/breeds/shihtzu/n02086240_762.jpg',
        id: '34',
      },
      {
        uri: 'https://images.dog.ceo/breeds/deerhound-scottish/n02092002_3.jpg',
        id: '35',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spitz-indian/Indian_Spitz.jpg',
        id: '36',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mountain-bernese/n02107683_3379.jpg',
        id: '37',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spaniel-blenheim/n02086646_602.jpg',
        id: '38',
      },
      {uri: 'https://images.dog.ceo/breeds/dhole/n02115913_4032.jpg', id: '39'},
      {
        uri: 'https://images.dog.ceo/breeds/dane-great/photo_2018-12-24_10-55-43_(2).jpg',
        id: '40',
      },
      {
        uri: 'https://images.dog.ceo/breeds/setter-irish/n02100877_1913.jpg',
        id: '41',
      },
      {uri: 'https://images.dog.ceo/breeds/cockapoo/Guri9.jpg', id: '42'},
      {
        uri: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_5857.jpg',
        id: '43',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mountain-swiss/n02107574_1871.jpg',
        id: '44',
      },
      {
        uri: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_8181.jpg',
        id: '45',
      },
      {
        uri: 'https://images.dog.ceo/breeds/groenendael/n02105056_3107.jpg',
        id: '46',
      },
      {
        uri: 'https://images.dog.ceo/breeds/cotondetulear/100_2013.jpg',
        id: '47',
      },
      {
        uri: 'https://images.dog.ceo/breeds/rajapalayam-indian/Rajapalayam-dog.jpg',
        id: '48',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-norwich/n02094258_2191.jpg',
        id: '49',
      },
      {
        uri: 'https://images.dog.ceo/breeds/samoyed/n02111889_17827.jpg',
        id: '50',
      },
    ],
    [],
  );

  // 预加载图片，首屏体验极致
  React.useEffect(() => {
    const startTime = Date.now();
    Promise.all(
      photos.map((photo, index) => {
        return Image.prefetch(photo.uri)
          .then(() => {
            pendingImageSet.current.add(photo.id);
            prefetchedCallback();
            if (refreshLoadedImageTimeout.current === null) {
              refreshLoadedImageTimeout.current = setTimeout(() => {
                setDownloadedData(prev => {
                  pendingImageSet.current.forEach(uri => {
                    prev.data.add(uri);
                  });
                  pendingImageSet.current.clear();
                  return {time: Date.now(), data: prev.data};
                });
                refreshLoadedImageTimeout.current = null;
              }, 50);
            }
            return null;
          })
          .catch(error => {
            console.log(
              `预加载失败 ${index + 1}/${photos.length}: ${photo.uri}, 错误:`,
              error,
            );
            return null;
          });
      }),
    )
      .then(() => {
        prefetchTime.current = Date.now() - startTime;
        console.log('prefetchTime', prefetchTime.current);
        if (refreshLoadedImageTimeout.current !== null) {
          clearTimeout(refreshLoadedImageTimeout.current);
          refreshLoadedImageTimeout.current = null;
        }
        setDownloadedData(prev => {
          pendingImageSet.current.forEach(uri => {
            prev.data.add(uri);
          });
          pendingImageSet.current.clear();
          return {time: Date.now(), data: prev.data};
        });
      })
      .catch(error => {
        console.log(`预加载过程发生错误:`, error);
      });
  }, []);

  return (
    <View style={styles.container}>
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <Text style={{fontSize: 16, color: '#888'}}>预加载完成: {prefetchedNum}/{photos.length}</Text>
        <Text style={{fontSize: 16, color: '#888'}}>
            图片渲染完成: {loadedNum}/{photos.length}
        </Text>
        <Text style={{fontSize: 16, color: '#888'}}>预加载耗时: {prefetchTime.current}ms</Text>
      </View>
      <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
        {photos.map(photo => {
          return (
            <TestImage
              uri={photo.uri}
              key={photo.id}
              id={photo.id}
              downloaded={downloadedData.data.has(photo.id)}
              loadedCallback={loadedCallback}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  header: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  footer: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 12,
  },
  overlay: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 6,
  },
  overlayText: {
    color: '#fff',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
