import { CheckoutGradients } from '@/components/gradients/checkout-gradients';
import '../../../styles/checkout.css';
import { CheckoutHeader } from '@/components/checkout/checkout-header';
import { CheckoutContents } from '@/components/checkout/checkout-contents';
import { auth } from '../../(auth)/auth';
import {redirect} from "next/navigation";

export default async function CheckoutPage() {
  const session = await auth();

  if(!session){
    redirect('/login');
  }

  const user = session.user;

  return (
    <div className={'w-full min-h-screen relative overflow-hidden'}>
      <CheckoutGradients />
      <div
        className={'mx-auto max-w-6xl relative px-[16px] md:px-[32px] py-[24px] flex flex-col gap-6 justify-between'}
      >
        <CheckoutHeader />
        <CheckoutContents userEmail={user.email ?? undefined} />
      </div>
    </div>
  );
}
