use inc::Module::Install;

RTx('RT-Extension-PasteImageAttachment');
all_from( 'lib/RT/Extension/PasteImageAttachment.pm');

requires_rt('4.2');

&WriteAll();
