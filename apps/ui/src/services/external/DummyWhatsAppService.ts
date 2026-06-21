import type { IWhatsAppService } from "./types";
import type { CreateEnquiryInput } from "@/types/enquiry";
import { dummyNotificationService } from "./DummyNotificationService";

export class DummyWhatsAppService implements IWhatsAppService {
  async receiveEnquiry(
    payload: CreateEnquiryInput,
  ): Promise<{ enquiryId: string }> {
    const enquiryId = `wa-enq-${Date.now()}`;
    await dummyNotificationService.sendInApp(
      "ops-team",
      "WhatsApp enquiry received",
      `${payload.patientName} — ${payload.phone}`,
      {},
    );
    return { enquiryId };
  }

  async sendPaymentLink(
    phone: string,
    link: string,
  ): Promise<{ messageId: string }> {
    await dummyNotificationService.sendWhatsApp(
      phone,
      `Your Livotale payment link: ${link}`,
    );
    return { messageId: `wa-msg-${Date.now()}` };
  }

  async sendOrderUpdate(
    phone: string,
    message: string,
  ): Promise<{ messageId: string }> {
    await dummyNotificationService.sendWhatsApp(phone, message);
    return { messageId: `wa-msg-${Date.now()}` };
  }

  async sendReportReady(
    phone: string,
    reportUrl: string,
  ): Promise<{ messageId: string }> {
    await dummyNotificationService.sendWhatsApp(
      phone,
      `Your report is ready: ${reportUrl}`,
    );
    return { messageId: `wa-msg-${Date.now()}` };
  }
}

export const dummyWhatsAppService = new DummyWhatsAppService();
