import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export function getTodayRangeJakarta() {
  const start = dayjs()
    .tz("Asia/Jakarta")
    .startOf("day")
    .utc()
    .toDate();

  const end = dayjs()
    .tz("Asia/Jakarta")
    .endOf("day")
    .utc()
    .toDate();

  return { start, end };
}
