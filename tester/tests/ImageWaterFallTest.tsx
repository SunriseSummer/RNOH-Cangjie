import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import Waterfall, {type WaterfallItem} from './WaterFall/ImageWaterFall';

export function ImageWaterFallTest() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [prefetchTime, setPrefetchTime] = useState(0);

  const photos: WaterfallItem[] = useMemo(
    () => [
      {
        uri: 'https://images.dog.ceo/breeds/terrier-kerryblue/n02093859_2699.jpg',
        id: '0',
      },
      {
        uri: 'https://images.dog.ceo/breeds/segugio-italian/n02090722_001.jpg',
        id: '1',
      },
      {uri: 'https://images.dog.ceo/breeds/cavapoo/lulu2.jpg', id: '2'},
      {
        uri: 'https://images.dog.ceo/breeds/hound-afghan/n02088094_3159.jpg',
        id: '3',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spaniel-irish/n02102973_399.jpg',
        id: '4',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-fox/n02095314_401.jpg',
        id: '5',
      },
      {
        uri: 'https://images.dog.ceo/breeds/samoyed/n02111889_15299.jpg',
        id: '6',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-sealyham/n02095889_2861.jpg',
        id: '7',
      },
      {
        uri: 'https://images.dog.ceo/breeds/leonberg/n02111129_4442.jpg',
        id: '8',
      },
      {
        uri: 'https://images.dog.ceo/breeds/ridgeback-rhodesian/n02087394_8339.jpg',
        id: '9',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-norfolk/n02094114_1353.jpg',
        id: '10',
      },
      {
        uri: 'https://images.dog.ceo/breeds/hound-plott/hhh_plott002.jpg',
        id: '11',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mountain-bernese/n02107683_3902.jpg',
        id: '12',
      },
      {
        uri: 'https://images.dog.ceo/breeds/springer-english/n02102040_3887.jpg',
        id: '13',
      },
      {uri: 'https://images.dog.ceo/breeds/mix/xeshaBelka_(38).jpg', id: '14'},
      {
        uri: 'https://images.dog.ceo/breeds/eskimo/n02109961_1613.jpg',
        id: '15',
      },
      {
        uri: 'https://images.dog.ceo/breeds/australian-kelpie/IMG_2599.jpg',
        id: '16',
      },
      {
        uri: 'https://images.dog.ceo/breeds/labradoodle/labradoodle-forrest.jpg',
        id: '17',
      },
      {uri: 'https://images.dog.ceo/breeds/lhasa/n02098413_4667.jpg', id: '18'},
      {uri: 'https://images.dog.ceo/breeds/terrier-welsh/lucy.jpg', id: '19'},
      {
        uri: 'https://images.dog.ceo/breeds/poodle-miniature/n02113712_3293.jpg',
        id: '20',
      },
      {
        uri: 'https://images.dog.ceo/breeds/chihuahua/n02085620_3742.jpg',
        id: '21',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mountain-bernese/n02107683_3797.jpg',
        id: '22',
      },
      {
        uri: 'https://images.dog.ceo/breeds/african-wild/n02116738_7122.jpg',
        id: '23',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-yorkshire/n02094433_2375.jpg',
        id: '24',
      },
      {
        uri: 'https://images.dog.ceo/breeds/doberman/n02107142_971.jpg',
        id: '25',
      },
      {
        uri: 'https://images.dog.ceo/breeds/australian-kelpie/IMG_3675.jpg',
        id: '26',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mastiff-bull/n02108422_2990.jpg',
        id: '27',
      },
      {uri: 'https://images.dog.ceo/breeds/gaddi-indian/Gaddi.jpg', id: '28'},
      {
        uri: 'https://images.dog.ceo/breeds/dachshund/dog-495122_640.jpg',
        id: '29',
      },
      {
        uri: 'https://images.dog.ceo/breeds/airedale/n02096051_6570.jpg',
        id: '30',
      },
      {uri: 'https://images.dog.ceo/breeds/cavapoo/doggo2.jpg', id: '31'},
      {
        uri: 'https://images.dog.ceo/breeds/saluki/n02091831_2858.jpg',
        id: '32',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spitz-indian/Indian_Spitz.jpg',
        id: '33',
      },
      {
        uri: 'https://images.dog.ceo/breeds/terrier-toy/n02087046_6986.jpg',
        id: '34',
      },
      {
        uri: 'https://images.dog.ceo/breeds/danish-swedish-farmdog/ebba_004.jpg',
        id: '35',
      },
      {
        uri: 'https://images.dog.ceo/breeds/groenendael/n02105056_4640.jpg',
        id: '36',
      },
      {
        uri: 'https://images.dog.ceo/breeds/setter-english/n02100735_7940.jpg',
        id: '37',
      },
      {uri: 'https://images.dog.ceo/breeds/cavapoo/doggo1.jpg', id: '38'},
      {
        uri: 'https://images.dog.ceo/breeds/coonhound/n02089078_2801.jpg',
        id: '39',
      },
      {
        uri: 'https://images.dog.ceo/breeds/mudhol-indian/Indian-Mudhol.jpg',
        id: '40',
      },
      {
        uri: 'https://images.dog.ceo/breeds/australian-shepherd/leroy.jpg',
        id: '41',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spaniel-brittany/n02101388_3195.jpg',
        id: '42',
      },
      {
        uri: 'https://images.dog.ceo/breeds/collie-border/n02106166_1506.jpg',
        id: '43',
      },
      {uri: 'https://images.dog.ceo/breeds/sharpei/noel.jpg', id: '44'},
      {
        uri: 'https://images.dog.ceo/breeds/brabancon/n02112706_1862.jpg',
        id: '45',
      },
      {
        uri: 'https://images.dog.ceo/breeds/weimaraner/n02092339_31.jpg',
        id: '46',
      },
      {
        uri: 'https://images.dog.ceo/breeds/tervuren/yoda_in_sofa.jpg',
        id: '47',
      },
      {
        uri: 'https://images.dog.ceo/breeds/kuvasz/n02104029_4696.jpg',
        id: '48',
      },
      {
        uri: 'https://images.dog.ceo/breeds/spaniel-blenheim/n02086646_309.jpg',
        id: '49',
      },
    ],
    [page],
  );

  // 预加载图片，首屏体验极致
  React.useEffect(() => {
    setReady(false);
    const startTime = Date.now();
    console.log(`开始预加载第${page}页的图片，共${photos.length}张`);
    Promise.all(
      photos.map((photo, index) => {
        console.log(`预加载图片 ${index + 1}/${photos.length}: ${photo.uri}`);
        return Image.prefetch(photo.uri)
          .then(() => {
            console.log(
              `预加载成功 ${index + 1}/${photos.length}: ${photo.uri}`,
            );
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
        const endTime = Date.now() - startTime;
        console.log(`第${page}页图片预加载完成，耗时${endTime}ms`);
        setReady(true);
        setPrefetchTime(endTime);
      })
      .catch(error => {
        console.log(`预加载过程发生错误:`, error);
        setReady(true);
      });
  }, [page]);

  const handleFetchMore = useCallback(() => {
    // Simulate pagination by incrementing page; memoized photos depend on page
    setPage(p => p + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Simulate a refresh action
    setTimeout(() => {
      setPage(1);
      setIsRefreshing(false);
    }, 800);
  }, []);

  return (
    <View style={styles.container}>
      {!ready ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 16, color: '#888'}}>图片预加载中…</Text>
        </View>
      ) : (
        <Waterfall
          data={photos}
          onEndReached={handleFetchMore}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          renderOverlay={({item}) => (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>#{item.id}</Text>
            </View>
          )}
          ListHeaderComponent={
            <Text style={styles.header}>
              Image Waterfall Dem, prefetch time: {prefetchTime} ms
            </Text>
          }
          ListFooterComponent={
            <Text style={styles.footer}>Loaded page {page}</Text>
          }
        />
      )}
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
