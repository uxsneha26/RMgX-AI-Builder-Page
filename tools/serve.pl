#!/usr/bin/perl
# Minimal static file server for local preview (no dependencies beyond core Perl).
use strict; use warnings;
use HTTP::Daemon; $SIG{PIPE} = "IGNORE"; use HTTP::Status; use File::Spec; use Cwd 'abs_path';
my $port = $ARGV[0] || 4173;
my $root = abs_path($ARGV[1] || '.');
my %mime = (html=>'text/html; charset=utf-8', css=>'text/css', js=>'application/javascript', png=>'image/png', jpg=>'image/jpeg', jpeg=>'image/jpeg', svg=>'image/svg+xml', webp=>'image/webp', json=>'application/json', ico=>'image/x-icon');
my $d = HTTP::Daemon->new(LocalAddr=>'127.0.0.1', LocalPort=>$port, ReuseAddr=>1) or die "Cannot listen on $port: $!";
print "Serving $root at http://localhost:$port\n"; $| = 1;
$SIG{CHLD} = "IGNORE";
while (my $c = $d->accept) {
  my $pid = fork(); if (!defined $pid || $pid) { $c->close if defined $pid; next; }
  $c->timeout(5);
  if (my $r = $c->get_request) {
    $c->force_last_request;
    my $p = $r->uri->path; $p =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/eg; $p .= 'index.html' if $p =~ m{/$};
    my $f = abs_path(File::Spec->catfile($root, $p));
    if ($f && index($f, $root) == 0 && -f $f) {
      my ($ext) = $f =~ /\.(\w+)$/; my $res = HTTP::Response->new(200);
      $res->header('Content-Type' => $mime{lc($ext||'')} || 'application/octet-stream');
      $res->header('Cache-Control' => 'no-store');
      open(my $fh, '<:raw', $f); local $/; $res->content(<$fh>); close $fh;
      $c->send_response($res);
    } else { $c->send_error(RC_NOT_FOUND); }
  }
  $c->close; exit 0;
}
