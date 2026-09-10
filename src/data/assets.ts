/**
 * 远端资源（阿里云 OSS）地址的唯一入口。
 *
 * OSS 上的对象名包含中文、空格与全角括号，之前这些 URL 以百分号编码的形式
 * 逐字散落在各个页面里，既难读也容易改漏。这里统一按路径段编码，
 * 保证与 OSS 上的 object key 一一对应。
 *
 * 用法：asset('images/施洞苗绣1.webp')
 *   -> https://zhao-portfolio-assets.oss-cn-beijing.aliyuncs.com/images/%E6%96%BD%E6%B4%9E%E8%8B%97%E7%BB%A31.webp
 */
export const ASSET_ORIGIN = 'https://zhao-portfolio-assets.oss-cn-beijing.aliyuncs.com';

/**
 * encodeURIComponent 会原样保留 `! ' ( ) *`，但这些字符在历史链接里是写成
 * `%21 %27 %28 %29 %2A` 的。为了让生成的地址与既有地址逐字节一致，
 * 这里把它们补编码一次。
 */
const encodeSegment = (segment: string): string =>
  encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

export const asset = (objectPath: string): string =>
  `${ASSET_ORIGIN}/${objectPath.split('/').map(encodeSegment).join('/')}`;
