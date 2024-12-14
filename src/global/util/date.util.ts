export class DateUtil {
  static getKSTDate(): string {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstDate = new Date(now.getTime() + kstOffset * 60000);
    return kstDate.toISOString().split('T')[0];
  }
}
