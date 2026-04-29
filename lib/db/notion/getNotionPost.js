import BLOG from '@/blog.config'
import { getDateValue, getPageTitle, getTextContent, idToUuid } from 'notion-utils'
import formatDate from '../../utils/formatDate'
import { fetchNotionPageBlocks } from './getPostBlocks'
import { checkStrIsNotionId, checkStrIsUuid } from '@/lib/utils'
import { mapImgUrl } from './mapImage'
import { normalizePageBlock } from './normalizeUtil'

/**
 * 根据页面ID获取文章，同时打印获取耗时
 * @param {*} pageId
 * @returns
 */
export async function fetchPageFromNotion(pageId) {
  const start = Date.now() // 开始时间

  // 获取页面内容块
  const blockMap = await fetchNotionPageBlocks(pageId, 'slug')
  const fetchEnd = Date.now() // fetchNotionPageBlocks 耗时
  console.log(`⏱ [Notion] pageId: ${pageId} fetch blocks耗时: ${fetchEnd - start}ms`)

  if (!blockMap) {
    return null
  }

  if (checkStrIsNotionId(pageId)) {
    pageId = idToUuid(pageId)
  }
  if (!checkStrIsUuid(pageId)) {
    return null
  }

  const postInfo = normalizePageBlock(blockMap?.block?.[pageId]?.value)
  if (!postInfo) {
    return null
  }

  const rawDate = getDateValue(postInfo?.properties?.date)
  const publishTimestamp = new Date(
    rawDate?.start_date || postInfo?.created_time || Date.now()
  ).getTime()
  const lastEditedTimestamp = new Date(
    postInfo?.last_edited_time || postInfo?.created_time || Date.now()
  ).getTime()
  const title =
    getPageTitle(blockMap) ||
    getTextContent(postInfo?.properties?.title) ||
    getTextContent(postInfo?.properties?.name) ||
    null

  const result = {
    id: pageId,
    type: postInfo.type,
    category: '',
    tags: [],
    title,
    status: 'Published',
    publishDate: publishTimestamp,
    publishDay: formatDate(publishTimestamp, BLOG.LANG),
    createdTime: formatDate(postInfo?.created_time, BLOG.LANG),
    lastEditedDate: new Date(lastEditedTimestamp),
    lastEditedDay: formatDate(lastEditedTimestamp, BLOG.LANG),
    fullWidth: postInfo?.format?.page_full_width ?? false,
    pageCover: getPageCover(postInfo) || BLOG.HOME_BANNER_IMAGE || null,
    pageCoverThumbnail:
      mapImgUrl(postInfo?.format?.page_cover, postInfo, 'block') ??
      BLOG.HOME_BANNER_IMAGE ??
      null,
    date: {
      start_date: rawDate?.start_date || formatDate(publishTimestamp, BLOG.LANG)
    },
    blockMap
  }

  const end = Date.now() // 总耗时
  console.log(`✅ [Notion] pageId: ${pageId} total处理耗时: ${end - start}ms`)

  return result
}

/**
 * 获取页面封面，优先级：Notion页面封面 > 站点默认封面 > null
 */
function getPageCover(postInfo) {
  const pageCover = postInfo?.format?.page_cover
  if (!pageCover) return null
  if (pageCover.startsWith('/')) return BLOG.NOTION_HOST + pageCover
  if (pageCover.startsWith('http')) {
    return pageCover
  }
  return mapImgUrl(pageCover, postInfo) ?? null
}
