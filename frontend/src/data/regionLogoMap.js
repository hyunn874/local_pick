export const REGION_LOGOS = {
  서울특별시: require('../../assets/regions/seoul.png'),
  부산광역시: require('../../assets/regions/busan.png'),
  대구광역시: require('../../assets/regions/daegu.png'),
  인천광역시: require('../../assets/regions/incheon.png'),
  광주광역시: require('../../assets/regions/gwangju.png'),
  대전광역시: require('../../assets/regions/daejeon.png'),
  울산광역시: require('../../assets/regions/ulsan.png'),
  세종특별자치시: require('../../assets/regions/sejong.png'),
  경기도: require('../../assets/regions/gyeonggi.png'),
  강원특별자치도: require('../../assets/regions/gangwon.png'),
  충청북도: require('../../assets/regions/chungbuk.png'),
  충청남도: require('../../assets/regions/chungnam.png'),
  전북특별자치도: require('../../assets/regions/jeonbuk.png'),
  전라북도: require('../../assets/regions/jeonbuk.png'),
  전라남도: require('../../assets/regions/jeonnam.png'),
  경상북도: require('../../assets/regions/gyeongbuk.png'),
  경상남도: require('../../assets/regions/gyeongnam.png'),
  제주특별자치도: require('../../assets/regions/jeju.png'),
};

export const DEFAULT_REGION_LOGO = require('../../assets/regions/default.png');

export function getRegionLogoSource(sidoName) {
  return REGION_LOGOS[sidoName] || DEFAULT_REGION_LOGO;
}
