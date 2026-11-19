import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  "error.update.unsupported": "التحديثات متاحة في إصدارات سطح المكتب المثبّتة.",
  "error.update.notReady": "لا يوجد تحديث جاهز للتثبيت.",
  "error.update.restartFailed": "تعذّر على MyBot إعادة التشغيل لتثبيت التحديث.",
  "error.update.downloadStalled": "توقف تنزيل التحديث عن الاستجابة. حاول مرة أخرى.",
  "error.update.installFailed": "تعذّر تثبيت التحديث. أغلق MyBot وأعد فتحه، ثم حاول مرة أخرى.",
  "error.update.notInstalled": "لم تُثبِّت إعادة التشغيل الأخيرة التحديث. أعد التشغيل للمحاولة مرة أخرى.",
  "error.update.downloadFailed": "تعذّر تنزيل التحديث. حاول مرة أخرى.",
  "error.update.checkFailed": "تعذّر التحقق من وجود تحديثات. حاول مرة أخرى.",
  "error.update.checkStalled": "توقف التحقق من التحديثات عن الاستجابة. حاول مرة أخرى.",
  "error.update.checkOffline": "تعذّر الوصول إلى خدمة التحديث. تحقق من اتصالك بالإنترنت، ثم حاول مرة أخرى.",
  "error.update.checkUnavailable": "لم تستجب خدمة التحديث. سيحاول MyBot مرة أخرى تلقائيًا خلال بضع دقائق.",
  "error.update.checkNoRelease": "لم يُعثر على تحديث منشور لهذه المنصة. سيحاول MyBot مرة أخرى تلقائيًا خلال بضع دقائق.",
  "error.update.managedByNix": "يثبّت Nix التحديثات لهذه النسخة من MyBot. حدّثها باستخدام Nix.",
  "error.update.managedByHost": "يثبّت المضيف التحديثات على جهاز Mac هذا. يبقى التحديث جاهزًا حتى تُجرى صيانة المضيف.",
  "error.update.siblingSession":
    "لا تزال جلسة MyBot أخرى تعمل من هذا التطبيق. أوقف MyBot في كل حسابات مستخدمي macOS الأخرى أولًا، ثم ثبّت التحديث مرة أخرى.",
  "error.update.siblingSessionSameAccount":
    "لا تزال عملية MyBot أخرى تعمل في حساب المستخدم هذا. أغلقها، ثم ثبّت التحديث مرة أخرى.",
  "error.update.siblingCheckFailed": "تعذّر التحقق من جلسات MyBot الأخرى. حاول مرة أخرى قبل التثبيت.",
  "error.update.readOnlyLocation":
    "لا يمكن لـ MyBot تثبيت التحديثات من هذا الموقع. أغلق MyBot. في Finder، اسحب MyBot إلى مجلد التطبيقات (إذا كان موجودًا هناك بالفعل، فاسحبه خارجه ثم أعده إليه). ثم افتح MyBot وثبّت التحديث مرة أخرى.",
  "error.update.appImageMissing":
    "لا يستطيع MyBot تثبيت التحديث لأن ملف AppImage الخاص به نُقل أو أُعيدت تسميته أو استُبدل. أغلق MyBot، ثم افتح ملف AppImage مرة أخرى.",
  "error.update.appImageReadOnly":
    "لا يستطيع MyBot تثبيت التحديثات في مجلد ملف AppImage الخاص به. أغلق MyBot، وانقل ملف AppImage إلى مجلد داخل مجلدك الرئيسي، ثم افتحه وثبّت التحديث مرة أخرى.",
  "error.update.remoteDisabled": "التحديثات من مسؤولي الخوادم معطّلة على هذا الحاسوب.",
  "error.update.restartStarted": "يعيد MyBot التشغيل بالفعل لتثبيت التحديث.",
  "error.update.alreadyRestarting": "يعيد MyBot التشغيل بالفعل.",
} as const satisfies PartialTranslation<typeof source>;
